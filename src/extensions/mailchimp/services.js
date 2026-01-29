'use strict';

const mailchimp = require('@mailchimp/mailchimp_marketing');

module.exports = {
  /**
   * Initialize Mailchimp client
   */
  initializeMailchimp() {
    mailchimp.setConfig({
      apiKey: process.env.MAILCHIMP_API_KEY,
      server: process.env.MAILCHIMP_SERVER_PREFIX,
    });
    return mailchimp;
  },

  /**
   * Send a campaign to Mailchimp audience (MIDIS list)
   * @param {Object} campaignData - Campaign data
   * @param {string} campaignData.subject - Campaign subject line
   * @param {string} campaignData.previewText - Preview text for email
   * @param {string} campaignData.htmlContent - HTML content of the campaign
   * @param {string} campaignData.fromName - From name
   * @param {string} campaignData.replyTo - Reply to email
   * @param {boolean} campaignData.autoSend - Auto-send or create as draft (default: false = draft)
   * @returns {Promise<Object>} - Campaign result
   */
  async sendCampaign(campaignData) {
    try {
      console.log('[MAILCHIMP-SERVICE] Initializing Mailchimp client...');
      console.log('[MAILCHIMP-SERVICE] API Key:', process.env.MAILCHIMP_API_KEY ? '✓ Set' : '✗ Not set');
      console.log('[MAILCHIMP-SERVICE] Server Prefix:', process.env.MAILCHIMP_SERVER_PREFIX);
      console.log('[MAILCHIMP-SERVICE] Audience ID:', process.env.MAILCHIMP_AUDIENCE_ID);

      const client = this.initializeMailchimp();
      
      console.log('[MAILCHIMP-SERVICE] Client initialized');

      const campaignContent = {
        type: 'regular',
        recipients: {
          list_id: process.env.MAILCHIMP_AUDIENCE_ID, // MIDIS list ID
        },
        settings: {
          subject_line: campaignData.subject,
          preview_text: campaignData.previewText,
          from_name: campaignData.fromName || 'Mining Discovery',
          reply_to: campaignData.replyTo || process.env.MAILCHIMP_REPLY_EMAIL,
        },
      };

      console.log('[MAILCHIMP-SERVICE] Creating campaign with settings:', campaignContent);

      // Create campaign
      const campaign = await client.campaigns.create(campaignContent);
      console.log('[MAILCHIMP-SERVICE] ✓ Campaign created:', campaign.id);

      // Set campaign content
      console.log('[MAILCHIMP-SERVICE] Setting campaign HTML content...');
      await client.campaigns.setContent(campaign.id, {
        html: campaignData.htmlContent,
      });
      console.log('[MAILCHIMP-SERVICE] ✓ HTML content set');

      // By default, create as DRAFT - user sends manually from Mailchimp dashboard
      // Only auto-send if explicitly requested
      if (campaignData.autoSend === true) {
        console.log('[MAILCHIMP-SERVICE] Sending campaign immediately...');
        await client.campaigns.send(campaign.id);
        console.log('[MAILCHIMP-SERVICE] ✓ Campaign sent');
        strapi.log.info(`Campaign sent: ${campaign.id}`);
        return {
          success: true,
          campaignId: campaign.id,
          status: 'sent',
          message: 'Campaign created and sent successfully',
        };
      } else {
        console.log('[MAILCHIMP-SERVICE] Campaign saved as DRAFT (not sent automatically)');
        console.log('[MAILCHIMP-SERVICE] ✓ Campaign ready in Mailchimp dashboard');
        strapi.log.info(`Campaign created as draft: ${campaign.id}`);
        return {
          success: true,
          campaignId: campaign.id,
          status: 'draft',
          message: 'Campaign created as draft. Send manually from Mailchimp dashboard.',
        };
      }
    } catch (error) {
      console.log('[MAILCHIMP-SERVICE] ✗ ERROR:', error.message);
      console.log('[MAILCHIMP-SERVICE] Full Error:', error);
      strapi.log.error(`Mailchimp campaign error: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Add subscriber to MIDIS list
   * @param {string} email - Subscriber email
   * @param {Object} mergeFields - Additional subscriber data
   * @returns {Promise<Object>}
   */
  async addSubscriber(email, mergeFields = {}) {
    try {
      const client = this.initializeMailchimp();

      const subscriber = await client.lists.addListMember(
        process.env.MAILCHIMP_AUDIENCE_ID,
        {
          email_address: email,
          status: process.env.MAILCHIMP_DOUBLE_OPTIN === 'true' ? 'pending' : 'subscribed',
          merge_fields: mergeFields,
          tags: process.env.MAILCHIMP_DEFAULT_TAGS?.split(',') || [],
        }
      );

      strapi.log.info(`Subscriber added to MIDIS list: ${email}`);
      return { success: true, subscriberId: subscriber.id };
    } catch (error) {
      strapi.log.error(`Error adding subscriber: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get list information
   * @returns {Promise<Object>}
   */
  async getListInfo() {
    try {
      const client = this.initializeMailchimp();
      const list = await client.lists.getList(process.env.MAILCHIMP_AUDIENCE_ID);
      return {
        success: true,
        list: {
          id: list.id,
          name: list.name,
          contact: list.contact,
          subscriberCount: list.stats.member_count,
        },
      };
    } catch (error) {
      strapi.log.error(`Error fetching list info: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /**
   * Generate HTML email template for news
   * @param {Object} news - News section data or article data
   * @returns {string} - HTML content
   */
  generateNewsEmailTemplate(news) {
    // Handle both news-section and article formats
    const title = news.title || 'New Article';
    const shortDescription = news.short_description || news.excerpt || '';
    const description = news.description || news.fullContent || news.freeContent || '';
    const author = news.author || 'Mining Discovery';
    const publishDate = news.publish_on || news.publishedAt || news.createdAt;
    const baseUrl = process.env.FRONTEND_URL || 'https://www.miningdiscovery.com';
    // Use STRAPI_URL for media (images) if provided; otherwise fall back to frontend URL
    const mediaBase = process.env.STRAPI_URL || baseUrl;

    // Resolve image URL: accept string or Strapi image object and ensure absolute URLs for email clients.
    function resolveImageUrl(img) {
      if (!img) return '';
      if (typeof img === 'string') return img.startsWith('http') ? img : `${mediaBase}${img}`;
      const formats = img.formats || {};
      const prefer = ['large', 'medium', 'small', 'thumbnail'];
      for (const key of prefer) {
        if (formats[key] && formats[key].url) {
          const url = formats[key].url;
          if (url.startsWith('//')) return `https:${url}`;
          return url.startsWith('http') ? url : `${mediaBase}${url}`;
        }
      }
      if (img.url) {
        const url = img.url;
        if (url.startsWith('//')) return `https:${url}`;
        return url.startsWith('http') ? url : `${mediaBase}${url}`;
      }
      return '';
    }

    const imageUrl = resolveImageUrl(news.image);
    const newsUrl = news.type === 'news-section' 
      ? `${baseUrl}/news/${news.id}` 
      : `${baseUrl}/articles/${news.id}`;

    // Extract plain text from HTML description if needed
    const descriptionText = description.replace(/<[^>]*>/g, '').substring(0, 300);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #1a1a1a; color: #fff; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .title { font-size: 24px; font-weight: bold; margin: 20px 0; color: #1a1a1a; }
    .excerpt { font-size: 16px; color: #555; margin: 15px 0; line-height: 1.6; }
    .meta { font-size: 12px; color: #999; margin: 10px 0; }
    .author { font-size: 13px; color: #666; margin: 5px 0; font-style: italic; }
    .image { margin: 20px 0; text-align: center; }
    .image img { width: 100%; max-width: 500px; height: auto; border-radius: 4px; }
    .description { font-size: 14px; color: #555; margin: 15px 0; line-height: 1.7; }
    .cta { display: inline-block; background-color: #1a1a1a; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 4px; margin: 20px 0; font-weight: bold; }
    .cta:hover { background-color: #333; }
    .footer { text-align: center; font-size: 12px; color: #999; padding: 20px; border-top: 1px solid #ddd; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Mining Discovery</h1>
      <p style="margin: 10px 0; font-size: 14px;">Latest Corporate News</p>
    </div>
    <div class="content">
      ${publishDate ? `<div class="meta">Published: ${new Date(publishDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>` : ''}
      ${author ? `<div class="author">By ${author}</div>` : ''}
      <div class="title">${title}</div>
      ${shortDescription ? `<div class="excerpt">${shortDescription}</div>` : ''}
      ${imageUrl ? `<div class="image"><img src="${imageUrl}" alt="${title}" style="width:100%;max-width:500px;height:auto;border-radius:4px;display:block;" width="500"/></div>` : ''}
      ${descriptionText ? `<div class="description">${descriptionText}</div>` : ''}
      <a href="${newsUrl}" class="cta">Read Full Story</a>
    </div>
    <div class="footer">
      <p>&copy; 2026 Mining Discovery. All rights reserved.</p>
      <p><a href="*|UNSUB|*">Unsubscribe</a> | <a href="*|UPDATE_PROFILE|*">Update Preferences</a></p>
    </div>
  </div>
</body>
</html>
    `;
  },
};
