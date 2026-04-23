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
    const subscriberHash = crypto.createHash('md5').update(email.toLowerCase()).digest('hex');

    try {
      console.log(`[MAILCHIMP] 🔄 Syncing subscriber to Midis: ${email}`);

      // 1. Add/Update Subscriber (Idempotent)
      await mailchimp.lists.setListMember(listId, subscriberHash, {
        email_address: email,
        status_if_new: 'subscribed',
        merge_fields: {
          FNAME: subscriber.firstName || subscriber.name || '',
          LNAME: subscriber.lastName || '',
        },
      });

      // 2. Resolve Tags
      const tags = ['NEW_SUBSCRIBER']; // Required for Welcome Automation trigger

      if (Array.isArray(subscriber.subscriptions)) {
        if (subscriber.subscriptions.includes('magazines')) tags.push('MAGAZINES');
        if (subscriber.subscriptions.includes('corporate_news')) tags.push('CORPORATE_NEWS');
      }

      // 3. Apply Tags
      await mailchimp.lists.updateListMemberTags(listId, subscriberHash, {
        tags: tags.map(tag => ({ name: tag, status: 'active' })),
      });

      console.log(`[MAILCHIMP] ✅ Subscriber synced with tags: ${tags.join(', ')}`);
    } catch (error) {
      console.error(`[MAILCHIMP] ❌ Error syncing subscriber:`, error.message);
    }
  }

  /**
   * Create and send a campaign draft
   */
  async sendCampaign(contentType, content) {
    if (!this.initialized) this.configure();

    const listId = process.env.MAILCHIMP_LIST_ID || process.env.MAILCHIMP_AUDIENCE_ID;
    const tag = contentType === 'magazine' ? 'MAGAZINES' : 'corporate-news';
    const subjectPrefix = contentType === 'magazine' ? '📢 New Magazine Released' : '📢 Corporate Update';
    const title = content.Title || content.title;
    const subjectLine = `${subjectPrefix} - ${title}`;

    try {
      console.log(`[MAILCHIMP] Creating campaign for ${contentType}: ${title}`);

      // 1. Resolve Tag ID
      const tagId = await this.getOrCreateTagId(listId, tag);

      // 2. Create Campaign
      const campaign = await mailchimp.campaigns.create({
        type: 'regular',
        recipients: {
          list_id: listId,
          segment_opts: {
            saved_segment_id: tagId,
          },
        },
        settings: {
          subject_line: subjectLine,
          from_name: process.env.MAILCHIMP_FROM_NAME || 'Mining Discovery',
          reply_to: process.env.MAILCHIMP_REPLY_TO || 'noreply@miningdiscovery.com',
          preview_text: (content.Description || '').substring(0, 150),
        },
      });

      console.log(`[MAILCHIMP] Campaign created: ${campaign.id}`);

      // 3. Set Content
      const htmlContent = this.generateHtmlContent(contentType, content);
      await mailchimp.campaigns.setContent(campaign.id, {
        html: htmlContent,
      });

      console.log(`[MAILCHIMP] ✅ Campaign created successfully as DRAFT! ID: ${campaign.id}`);
      return true;

    } catch (error) {
      console.error(`[MAILCHIMP] ❌ Error sending campaign:`, error.response?.body || error.message);
      return false;
    }
  }

  /**
   * Get Tag ID from Mailchimp
   */
  async getOrCreateTagId(listId, tagName) {
    try {
      console.log(`[MAILCHIMP] Searching for Tag ID for: "${tagName}"...`);
      const response = await mailchimp.lists.listSegments(listId, {
        type: 'static',
        count: 100,
      });

      const segment = response.segments.find(
        (s) => s.name.toLowerCase() === tagName.toLowerCase()
      );

      if (segment) {
        console.log(`[MAILCHIMP] Found Tag ID: ${segment.id} for "${tagName}"`);
        return segment.id;
      }

      console.warn(`[MAILCHIMP] ⚠️ Tag "${tagName}" not found. Campaign will fail.`);
      return 0;
    } catch (error) {
      console.error(`[MAILCHIMP] ❌ Error fetching Tag ID:`, error.message);
      return 0;
    }
  }

  /**
   * Generate responsive HTML email content
   */
  generateHtmlContent(contentType, content) {
    const frontendUrl = process.env.FRONTEND_URL || 'https://www.miningdiscovery.com';
    const strapiUrl = process.env.STRAPI_URL || 'https://admins.miningdiscovery.com';

    const title = content.Title || content.title;
    const description = content.Description || content.short_description || '';

    // Resolve Link
    let link = `${frontendUrl}/${contentType}/${content.Slug || content.slug || ''}`;
    if (contentType === 'magazine' && content.pdf) {
      link = this.resolveMediaUrl(content.pdf);
    } else if (contentType === 'corporate') {
      const slug = content.Slug || content.slug || '';
      const docId = content.documentId || content.id || '';
      link = `${frontendUrl}/page/article/${slug}?id=${docId}`;
    }

    const imageUrl = this.resolveMediaUrl(content.coverImage || content.image);

    const featuresText = content.features || '';
    const featuresList = featuresText
      .split('\n')
      .filter(f => f.trim())
      .map(f => `<li>${f.trim()}</li>`)
      .join('');

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f0f2f5; }
        .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
        .header { background: #1a1a2e; padding: 30px 20px; text-align: center; }
        .header img { max-width: 220px; }
        .hero { width: 100%; max-height: 400px; object-fit: cover; display: block; border-bottom: 4px solid #d4a843; }
        .content { padding: 40px; }
        .content h1 { color: #1a1a2e; font-size: 28px; margin: 0 0 20px 0; text-align: center; font-weight: 800; }
        .description { color: #444; line-height: 1.8; margin-bottom: 25px; font-size: 16px; text-align: justify; }
        .features-section { background: #fdfaf3; padding: 25px; border-left: 4px solid #d4a843; border-radius: 4px; margin-bottom: 30px; }
        .features-section h3 { margin-top: 0; color: #1a1a2e; font-size: 18px; }
        .features-section ul { padding-left: 20px; margin-bottom: 0; }
        .features-section li { color: #555; margin-bottom: 10px; line-height: 1.5; }
        .cta-container { text-align: center; margin-top: 30px; }
        .btn { display: inline-block; padding: 16px 40px; background: #d4a843; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; }
        .footer { background: #f8f9fa; padding: 30px; text-align: center; font-size: 13px; color: #888; border-top: 1px solid #eee; }
        .footer a { color: #d4a843; text-decoration: none; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://www.miningdiscovery.com/image/mining-discovery-logo-1.png" alt="Mining Discovery">
        </div>
        ${imageUrl ? `<img src="${imageUrl}" alt="${title}" class="hero">` : ''}
        <div class="content">
            <h1>${title}</h1>
            <div class="description">${description}</div>
            ${featuresList ? `
            <div class="features-section">
                <h3>Highlights:</h3>
                <ul>${featuresList}</ul>
            </div>
            ` : ''}
            <div class="cta-container">
                <a href="${link}" class="btn">${contentType === 'magazine' ? '📄 Open PDF' : '📖 Read More'}</a>
            </div>
        </div>
        <div class="footer">
            <p><strong>Mining Discovery Platform</strong></p>
            <p>You are receiving this because you opted in for ${contentType === 'magazine' ? 'Magazines' : 'Corporate News'}.</p>
            <p><a href="*|UNSUB|*">Unsubscribe from these emails</a></p>
        </div>
    </div>
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
