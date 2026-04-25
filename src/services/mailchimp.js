const mailchimp = require('@mailchimp/mailchimp_marketing');
const crypto = require('crypto');
const dns = require('dns');

/**
 * DNS Monkey-patch for Windows/Mailchimp connectivity issues
 */
const originalLookup = dns.lookup;
dns.lookup = (hostname, options, callback) => {
  if (hostname.includes('mailchimp.com')) {
    return originalLookup('1.1.1.1', options, (err) => {
      if (err) return originalLookup(hostname, options, callback);
      return originalLookup(hostname, options, callback);
    });
  }
  return originalLookup(hostname, options, callback);
};

class MailchimpService {
  constructor() {
    this.initialized = false;
  }

  normalizeSubscriptions(subscriptions) {
    let subs = subscriptions;
    if (typeof subs === 'string') {
      try { subs = JSON.parse(subs); } catch { subs = []; }
    }
    if (!Array.isArray(subs)) return [];

    return subs
      .filter(Boolean)
      .map((sub) => String(sub).trim().toLowerCase().replace(/\s+/g, '-'));
  }

  getSubscriberTags(subscriptions) {
    const subs = this.normalizeSubscriptions(subscriptions);
    const tags = ['NEW_SUBSCRIBER'];

    const hasAny = (...aliases) => aliases.some((alias) => subs.includes(alias));

    if (hasAny('magazine', 'magazines', 'magzine')) tags.push('MAGAZINES');
    if (hasAny('corporate-news', 'corporate_news', 'corporate')) tags.push('CORPORATE_NEWS');
    if (hasAny('daily', 'daily-newsletter')) tags.push('daily-newsletter');
    if (hasAny('weekly', 'weekly-newsletter')) tags.push('weekly-newsletter');

    return [...new Set(tags)];
  }

  normalizeNewsletterTag(tag) {
    const normalizedTag = String(tag || '').trim().toLowerCase().replace(/\s+/g, '-');
    const tagMap = {
      daily: 'daily-newsletter',
      'daily-newsletter': 'daily-newsletter',
      weekly: 'weekly-newsletter',
      'weekly-newsletter': 'weekly-newsletter',
    };

    return tagMap[normalizedTag] || normalizedTag;
  }

  /**
   * Initialize Mailchimp SDK
   */
  configure() {
    const apiKey = process.env.MAILCHIMP_API_KEY;
    const server = process.env.MAILCHIMP_SERVER_PREFIX;

    if (!apiKey || !server) {
      console.error('[MAILCHIMP] ❌ Missing API Key or Server Prefix');
      return;
    }

    mailchimp.setConfig({
      apiKey,
      server,
    });

    this.initialized = true;
    console.log('[MAILCHIMP] ✅ Service initialized');
  }

  async syncSubscriber(subscriber) {
    if (!this.initialized) this.configure();

    const listId = process.env.MAILCHIMP_LIST_ID || process.env.MAILCHIMP_AUDIENCE_ID;
    const email = subscriber.email;

    // Guard: skip if no email
    if (!email) {
      console.warn('[MAILCHIMP] ⚠️ syncSubscriber called with no email — skipping.');
      return;
    }

    const subscriberHash = crypto.createHash('md5').update(email.toLowerCase()).digest('hex');

    try {
      console.log(`[MAILCHIMP] 🔄 Syncing subscriber: ${email}`);

      // 1. Add/Update the subscriber in Mailchimp.
      //    NOTE: merge_fields intentionally omitted — the subscriber schema only has
      //    email + subscriptions. Sending FNAME/LNAME as empty strings causes a
      //    400 Bad Request if those merge fields are required in the Mailchimp audience.
      await mailchimp.lists.setListMember(listId, subscriberHash, {
        email_address: email,
        status_if_new: 'subscribed',
      });

      const subs = this.normalizeSubscriptions(subscriber.subscriptions);
      console.log(`[MAILCHIMP] 📋 Subscriptions for ${email}:`, subs);

      // 3. Build tag list based on what the user actually subscribed to.
      //    NEW_SUBSCRIBER is always added — it triggers the Welcome Journey in Mailchimp.
      const tags = this.getSubscriberTags(subs);

      // 4. Apply tags to the subscriber in Mailchimp
      await mailchimp.lists.updateListMemberTags(listId, subscriberHash, {
        tags: tags.map(tag => ({ name: tag, status: 'active' })),
      });

      console.log(`[MAILCHIMP] ✅ Subscriber synced — tags applied: [${tags.join(', ')}]`);

    } catch (error) {
      // Log full Mailchimp error body for easier debugging
      const detail = error.response?.body
        ? JSON.stringify(error.response.body)
        : error.message;
      console.error(`[MAILCHIMP] ❌ Error syncing subscriber "${email}":`, detail);
    }
  }

  /**
   * Create and send a campaign draft targeted only at subscribers with a specific tag.
   * Uses Mailchimp's segment_opts with tag-based conditions — the correct approach
   * for tag-based filtering (not saved_segment_id which is for static segments).
   */
  async sendCampaign(contentType, content) {
    if (!this.initialized) this.configure();

    const listId = process.env.MAILCHIMP_LIST_ID || process.env.MAILCHIMP_AUDIENCE_ID;

    // ── Map content type → Mailchimp tag name ──────────────────────────────
    // These MUST exactly match the tag names applied in syncSubscriber()
    const TAG_MAP = {
      'magazine': 'MAGAZINES',
      'corporate': 'CORPORATE_NEWS',
      'evening-chatter': 'evening-chatter',
      'post-newsletter': null, // resolved dynamically from newsletter_category slug
    };

    const SUBJECT_MAP = {
      'magazine': 'New Magazine Released',
      'corporate': 'Corporate Update',
      'evening-chatter': 'Evening Chatter',
      'post-newsletter': 'Newsletter',
    };

    let tag = TAG_MAP[contentType];

    // For post-newsletter, derive tag from the newsletter_category slug
    if (contentType === 'post-newsletter') {
      tag = this.normalizeNewsletterTag(content.newsletter_category?.slug || content.newsletter_category?.name || 'daily-newsletter');
    }

    if (!tag) {
      console.error(`[MAILCHIMP] ❌ No tag resolved for contentType="${contentType}". Aborting campaign.`);
      return false;
    }

    const title = content.Title || content.title;
    const subjectLine = `${SUBJECT_MAP[contentType] || '📢 Update'} - ${title}`;

    try {
      console.log(`[MAILCHIMP] 🏷️  Campaign target tag: "${tag}" | Content: "${title}"`);

      // ── Safety: Resolve segment ID BEFORE creating the campaign ──────────
      // If null is returned, no subscriber has this tag yet — abort to prevent
      // the campaign from being created with no audience or sent to everyone.
      const segmentId = await this.getTagSegmentId(listId, tag);
      if (!segmentId) {
        console.error(`[MAILCHIMP] ❌ Aborting campaign — tag "${tag}" has no subscribers yet or doesn't exist in Mailchimp. Add at least one subscriber with this tag first.`);
        return false;
      }

      /**
       * segment_opts with conditions = Tag-based filtering.
       * This tells Mailchimp: "Only send to subscribers who have this tag."
       * - condition_type: 'StaticSegment' → filters by a saved static segment (which is how tags are stored)
       * - op: 'static_is' → subscriber must be IN this segment
       *
       * This is the CORRECT approach. Using saved_segment_id only works for
       * pre-built "Saved Segments", not for dynamic tag-based filtering.
       */
      const campaign = await mailchimp.campaigns.create({
        type: 'regular',
        recipients: {
          list_id: listId,
          segment_opts: {
            match: 'all',
            conditions: [
              {
                condition_type: 'StaticSegment',
                field: 'static_segment',
                op: 'static_is',
                value: segmentId,
              },
            ],
          },
        },
        settings: {
          subject_line: subjectLine,
          from_name: process.env.MAILCHIMP_FROM_NAME || 'Mining Discovery',
          reply_to: process.env.MAILCHIMP_REPLY_TO || 'noreply@miningdiscovery.com',
          preview_text: (content.Description || content.description || '').substring(0, 150),
        },
      });

      console.log(`[MAILCHIMP] Campaign draft created: ${campaign.id}`);

      // Fetch top news for the "Top News" section
      let topNews = [];
      try {
        if (typeof strapi !== 'undefined') {
          topNews = await strapi.documents('api::news-section.news-section').findMany({
            limit: 3,
            sort: 'publishedAt:desc',
            filters: {
              documentId: { $ne: content.documentId || '' }
            },
            populate: ['image']
          });
        }
      } catch (err) {
        console.warn('[MAILCHIMP] ⚠️ Could not fetch top news for campaign:', err.message);
      }

      // Set email HTML content
      const htmlContent = this.generateHtmlContent(contentType, content, topNews);
      await mailchimp.campaigns.setContent(campaign.id, { html: htmlContent });

      console.log(`[MAILCHIMP] ✅ Campaign DRAFT ready (tag="${tag}", id=${campaign.id}). Go to Mailchimp to review & send.`);
      return true;

    } catch (error) {
      console.error(`[MAILCHIMP] ❌ Error creating campaign:`, error.response?.body || error.message);
      return false;
    }
  }

  /**
   * Resolve the Mailchimp Segment ID for a given tag name.
   *
   * In Mailchimp, Tags are stored as "static segments". This method searches
   * existing static segments (which include tags) by name and returns its ID.
   * If the tag doesn't exist yet (no subscriber has been assigned it), it
   * returns null and the campaign creation will be skipped to avoid sending
   * to the wrong audience.
   */
  async getTagSegmentId(listId, tagName) {
    try {
      console.log(`[MAILCHIMP] 🔍 Looking up segment ID for tag: "${tagName}"`);

      // Fetch up to 1000 static segments (tags are stored as static segments in Mailchimp)
      const response = await mailchimp.lists.listSegments(listId, {
        type: 'static',
        count: 1000,
      });

      const match = (response.segments || []).find(
        (s) => s.name.toLowerCase() === tagName.toLowerCase()
      );

      if (match) {
        console.log(`[MAILCHIMP] ✅ Found segment ID ${match.id} for tag "${tagName}"`);
        return match.id;
      }

      // Tag exists in our system but no subscribers have it yet in Mailchimp
      console.warn(`[MAILCHIMP] ⚠️ Tag "${tagName}" not found as a segment. No subscribers have this tag yet, or the tag name is mismatched.`);
      return null;

    } catch (error) {
      console.error(`[MAILCHIMP] ❌ Error looking up tag segment:`, error.message);
      return null;
    }
  }

  /**
   * Generate responsive HTML email content
   */
  generateHtmlContent(contentType, content, topNews = []) {
    const frontendUrl = process.env.FRONTEND_URL || 'https://www.miningdiscovery.com';
    const title = content.Title || content.title || 'Mining Discovery Update';
    const description = content.Description || content.short_description || content.description || '';
    
    // Resolve Content Label
    const labelMap = {
      'corporate': 'Corporate News',
      'evening-chatter': 'Evening Chatter',
      'magazine': 'Magazine',
      'post-newsletter': 'Newsletter'
    };
    const label = labelMap[contentType] || 'News';

    // Resolve Link
    let link = `${frontendUrl}/${contentType}/${content.Slug || content.slug || ''}`;
    if (contentType === 'magazine' && content.pdf) {
      link = this.resolveMediaUrl(content.pdf);
    } else if (contentType === 'corporate' || contentType === 'evening-chatter') {
      const slug = content.Slug || content.slug || '';
      const docId = content.documentId || content.id || '';
      link = `${frontendUrl}/page/article/${slug}?id=${docId}`;
    } else if (contentType === 'post-newsletter' && content.pdfFile) {
      link = this.resolveMediaUrl(content.pdfFile);
    }

    const imageUrl = this.resolveMediaUrl(content.coverImage || content.image) || 'https://placehold.co/520x340/333333/a48045?text=Mining+Discovery';
    const buttonText = (contentType === 'magazine' || contentType === 'post-newsletter') ? 'Open PDF' : 'Explore More';

    // Split description into paragraphs
    const paragraphs = description
      .split('\n')
      .filter(p => p.trim())
      .map(p => `<p style="margin: 0 0 18px 0;">${p.trim()}</p>`)
      .join('');

    // Highlights / Features
    const featuresText = content.features || '';
    const featuresList = featuresText
      .split('\n')
      .filter(f => f.trim())
      .map(f => `<li style="margin-bottom: 10px;">${f.trim()}</li>`)
      .join('');

    const subscriptionText = contentType === 'magazine' ? 'Magazines' : 
                             contentType === 'evening-chatter' ? 'Evening Chatter' : 
                             contentType === 'post-newsletter' ? 'Newsletters' : 'Corporate News';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mining Discovery - ${title}</title>
    <!--[if mso]>
    <style type="text/css">
        body, table, td, p, a, h1, h2, h3 {font-family: Arial, sans-serif !important;}
    </style>
    <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
    <center style="width: 100%; background-color: #f4f4f4; padding-top: 20px; padding-bottom: 20px;">
        <table align="center" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 0 15px rgba(0,0,0,0.05);">
            <!-- TOP BANNER -->
            <tr>
                <td style="padding: 0;">
                    <a href="${frontendUrl}" target="_blank">
                        <img src="https://res.cloudinary.com/dntahkr0a/image/upload/f_auto,q_auto/Banner_Mailchimp_vkqkrf" alt="Mining Discovery Banner" style="width: 100%; max-width: 600px; display: block;" width="600">
                    </a>
                </td>
            </tr>

            <!-- MAIN NEWS SECTION -->
            <tr>
                <td style="padding: 30px 40px 10px 40px; text-align: left;">
                    <p style="margin: 0 0 5px 0; font-size: 16px; font-weight: 800; color: #0e1824; text-transform: uppercase;">${label}</p>
                    <h1 style="margin: 0 0 20px 0; font-size: 28px; color: #a48045; font-weight: bold; line-height: 1.2;">
                        ${title}
                    </h1>
                    <img src="${imageUrl}" alt="${title}" style="width: 100%; max-width: 520px; display: block; border-radius: 4px;" width="520">
                </td>
            </tr>

            <!-- MAIN ARTICLE TEXT -->
            <tr>
                <td style="padding: 10px 40px 30px 40px; color: #1a1a1a; font-size: 15px; line-height: 1.6; text-align: left;">
                    ${paragraphs}

                    ${featuresList ? `
                    <div style="margin-top: 25px; padding: 20px; background-color: #fdfaf3; border-left: 4px solid #a48045; border-radius: 4px;">
                        <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #0e1824;">Highlights:</h3>
                        <ul style="margin: 0; padding-left: 20px; color: #444;">
                            ${featuresList}
                        </ul>
                    </div>
                    ` : ''}
                </td>
            </tr>

            <!-- EXPLORE MORE BUTTON -->
            <tr>
                <td style="padding: 0 40px 40px 40px; text-align: center;">
                    <table align="center" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                            <td align="center" bgcolor="#a48045" style="border-radius: 4px;">
                                <a href="${link}" target="_blank" style="font-size: 16px; font-family: Helvetica, Arial, sans-serif; color: #ffffff; text-decoration: none; border-radius: 4px; padding: 12px 40px; border: 1px solid #a48045; display: inline-block; font-weight: bold;">
                                    ${buttonText}
                                </a>
                            </td>
                        </tr>
                    </table>
            ${topNews && topNews.length > 0 ? `
            <!-- TOP NEWS TITLE -->
            <tr>
                <td style="padding: 0 40px 20px 40px; text-align: left;">
                    <h2 style="margin: 0; font-size: 32px; color: #0e1824; font-weight: bold;">Top News</h2>
                </td>
            </tr>

            ${topNews.map((news, index) => {
              const newsTitle = news.Title || news.title;
              const newsImageUrl = this.resolveMediaUrl(news.image) || 'https://placehold.co/240x160/333333/a48045?text=News';
              const newsSlug = news.Slug || news.slug || '';
              const newsId = news.documentId || news.id || '';
              const newsLink = `${frontendUrl}/page/article/${newsSlug}?id=${newsId}`;
              
              // Alternating layout: index 0 and 2 have text left, index 1 has image left (as in user's template)
              const isTextLeft = index % 2 === 0;

              if (isTextLeft) {
                return `
                <!-- TOP NEWS ITEM (Text Left) -->
                <tr>
                    <td style="padding: 0 40px 30px 40px;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                                <!-- Text Block -->
                                <td width="48%" valign="middle" style="padding-right: 4%;">
                                    <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #1a1a1a; line-height: 1.4; font-weight: 600;">
                                        ${newsTitle}
                                    </h3>
                                    <table cellpadding="0" cellspacing="0" border="0">
                                        <tr>
                                            <td align="center" bgcolor="#a48045" style="border-radius: 4px;">
                                                <a href="${newsLink}" target="_blank" style="font-size: 13px; font-family: Helvetica, Arial, sans-serif; color: #ffffff; text-decoration: none; border-radius: 4px; padding: 8px 18px; border: 1px solid #a48045; display: inline-block; font-weight: bold;">Click to read more</a>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                                <!-- Image Block -->
                                <td width="48%" valign="middle">
                                    <img src="${newsImageUrl}" alt="${newsTitle}" style="width: 100%; max-width: 240px; display: block; border-radius: 4px;" width="240">
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
                `;
              } else {
                return `
                <!-- TOP NEWS ITEM (Image Left) -->
                <tr>
                    <td style="padding: 0 40px 30px 40px;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                                <!-- Image Block -->
                                <td width="48%" valign="middle" style="padding-right: 4%;">
                                    <img src="${newsImageUrl}" alt="${newsTitle}" style="width: 100%; max-width: 240px; display: block; border-radius: 4px;" width="240">
                                </td>
                                <!-- Text Block -->
                                <td width="48%" valign="middle">
                                    <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #1a1a1a; line-height: 1.4; text-align: right; font-weight: 600;">
                                        ${newsTitle}
                                    </h3>
                                    <table cellpadding="0" cellspacing="0" border="0" align="right">
                                        <tr>
                                            <td align="center" bgcolor="#a48045" style="border-radius: 4px;">
                                                <a href="${newsLink}" target="_blank" style="font-size: 13px; font-family: Helvetica, Arial, sans-serif; color: #ffffff; text-decoration: none; border-radius: 4px; padding: 8px 18px; border: 1px solid #a48045; display: inline-block; font-weight: bold;">Click to read more</a>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
                `;
              }
            }).join('')}
            ` : ''}

            <!-- DIVIDER -->
            <tr>
                <td style="padding: 0 40px 20px 40px;">
                    <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 0;">
                </td>
            </tr>

            <!-- ADVERTISEMENT BANNER -->
            <tr>
                <td style="padding: 0 0 20px 0;">
                    <a href="https://www.themininginvestmentevent.com/register" target="_blank">
                        <img src="https://res.cloudinary.com/dntahkr0a/image/upload/q_auto/f_auto/v1777024784/Mining_Investment_Banner_cuywie.jpg" alt="The Mining Investment Event 2026" style="width: 100%; max-width: 600px; display: block;" width="600">
                    </a>
                </td>
            </tr>

            <!-- AD BUTTON -->
            <tr>
                <td style="padding: 0 40px 30px 40px; text-align: center;">
                    <table align="center" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                            <td align="center" bgcolor="#a48045" style="border-radius: 4px;">
                                <a href="https://www.themininginvestmentevent.com/register" target="_blank" style="font-size: 16px; font-family: Helvetica, Arial, sans-serif; color: #ffffff; text-decoration: none; border-radius: 4px; padding: 12px 40px; border: 1px solid #a48045; display: inline-block; font-weight: bold;">
                                    Register for Event
                                </a>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>

            <!-- DIVIDER -->
            <tr>
                <td style="padding: 0 40px 20px 40px;">
                    <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 0;">
                </td>
            </tr>

            <!-- FOOTER -->
            <tr>
                <td style="padding: 10px 40px 40px 40px; text-align: center;">
                    <!-- Social Icons -->
                    <table align="center" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 25px;">
                        <tr>
                            <td style="padding: 0 5px;">
                                <a href="#" target="_blank"><img src="https://placehold.co/32x32/a48045/ffffff?text=X" width="32" height="32" alt="X" style="border-radius: 50%; display: block;"></a>
                            </td>
                            <td style="padding: 0 5px;">
                                <a href="#" target="_blank"><img src="https://placehold.co/32x32/a48045/ffffff?text=Y" width="32" height="32" alt="YouTube" style="border-radius: 50%; display: block;"></a>
                            </td>
                            <td style="padding: 0 5px;">
                                <a href="#" target="_blank"><img src="https://placehold.co/32x32/a48045/ffffff?text=In" width="32" height="32" alt="LinkedIn" style="border-radius: 50%; display: block;"></a>
                            </td>
                            <td style="padding: 0 5px;">
                                <a href="#" target="_blank"><img src="https://placehold.co/32x32/a48045/ffffff?text=Ig" width="32" height="32" alt="Instagram" style="border-radius: 50%; display: block;"></a>
                            </td>
                            <td style="padding: 0 5px;">
                                <a href="#" target="_blank"><img src="https://placehold.co/32x32/a48045/ffffff?text=F" width="32" height="32" alt="Facebook" style="border-radius: 50%; display: block;"></a>
                            </td>
                        </tr>
                    </table>

                    <p style="margin: 0 0 15px 0; font-size: 13px; font-weight: bold; color: #000000; font-family: Arial, sans-serif;">
                        180 Layfatte street Passaic New Jersey 07055
                    </p>

                    <table align="center" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                            <td style="font-size: 14px; font-weight: bold; color: #a48045; padding-right: 10px;">
                                Get in touch at:
                            </td>
                            <td style="font-size: 14px; color: #a48045; padding-right: 15px;">
                                <span style="text-decoration: none; color: #a48045;">📞 +1 (862) 295-0117</span>
                            </td>
                            <td style="font-size: 14px; color: #a48045;">
                                <span style="text-decoration: none; color: #a48045;">✉️ info@miningdiscovery.com</span>
                            </td>
                        </tr>
                    </table>

                    <div style="margin-top: 30px; font-size: 12px; color: #888;">
                        <p>You are receiving this because you opted in for ${subscriptionText} on Mining Discovery.</p>
                        <p><a href="*|UNSUB|*" style="color: #a48045; text-decoration: underline;">Unsubscribe from these emails</a></p>
                    </div>
                </td>
            </tr>
        </table>
    </center>
</body>
</html>
    `;
  }

  resolveMediaUrl(media) {
    if (!media || !media.url) return null;

    let url = media.url;
    console.log(`[MAILCHIMP] 📁 Processing Media: ${media.name} | Raw URL: ${url}`);

    // 1. If it's already an absolute URL (starts with http), use it
    if (url.startsWith('http')) return url;

    // 2. Remove any query strings (like ?updatedAt=...) that might confuse the link
    url = url.split('?')[0];

    // 3. Remove '/uploads/' prefix if it exists
    if (url.startsWith('/uploads/')) {
      url = url.replace('/uploads/', '/');
    } else if (url.startsWith('uploads/')) {
      url = url.replace('uploads/', '/');
    }

    // 4. Prepend the Media domain
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    const finalUrl = `https://acceptable-desire-0cca5bb827.media.strapiapp.com${cleanUrl}`;

    console.log(`[MAILCHIMP] 🔗 Final Resolved URL: ${finalUrl}`);
    return finalUrl;
  }

  // Legacy helper
  resolveImageUrl(content) {
    return this.resolveMediaUrl(content.coverImage || content.image);
  }
}

module.exports = new MailchimpService();
