'use strict';

const mailchimp = require('@mailchimp/mailchimp_marketing');

/**
 * Initialize Mailchimp client
 */
function initializeMailchimp() {
  mailchimp.setConfig({
    apiKey: process.env.MAILCHIMP_API_KEY,
    server: process.env.MAILCHIMP_SERVER_PREFIX,
  });
  return mailchimp;
}

/**
 * Generate HTML email template for news
 */
function generateNewsEmailTemplate(newsData) {
  const {
    title,
    short_description,
    description,
    image,
    slug,
  } = newsData;
  const baseUrl = process.env.FRONTEND_URL || 'https://www.miningdiscovery.com';

  // Resolve image URL from Strapi image object or plain string.
  // Prefer formatted versions (medium -> large -> small -> thumbnail), fall back to top-level `url`.
  function resolveImageUrl(img) {
    if (!img) return '';
    if (typeof img === 'string') return img.startsWith('http') ? img : `${baseUrl}${img}`;
    const formats = img.formats || {};
    const prefer = ['medium', 'large', 'small', 'thumbnail'];
    for (const key of prefer) {
      if (formats[key] && formats[key].url) {
        return formats[key].url.startsWith('http') ? formats[key].url : `${baseUrl}${formats[key].url}`;
      }
    }
    if (img.url) return img.url.startsWith('http') ? img.url : `${baseUrl}${img.url}`;
    return '';
  }

  const imageUrl = resolveImageUrl(image);
  // Prefer an ID param when available (newsData.id), otherwise use slug-only path
  const articleId = newsData.id || newsData._id || '';
  const articleUrl = articleId
    ? `${baseUrl}/page/article/${slug}?id=${articleId}`
    : `${baseUrl}/news/${slug}`;
  const descriptionText = description?.replace(/<[^>]*>/g, '').substring(0, 300) || '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin:0; padding:0; background:#f4f6f8; color:#222; }
    .outer { width:100%; padding:20px 0; background:#f4f6f8; }
    .container { max-width:700px; margin:0 auto; background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 6px 18px rgba(0,0,0,0.08); }
    .topbar { background:#041e42; padding:18px 24px; display:flex; align-items:center; }
    .logo { height:36px; }
    .brand { color:#ffffff; font-weight:700; margin-left:12px; font-size:18px; }
    .meta { padding:18px 24px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #eef2f6; }
    .meta .left { font-size:13px; color:#6b7280; }
    .meta .right { font-size:13px; color:#6b7280; }
    .hero { padding:24px; }
    .title { font-size:22px; font-weight:700; color:#0f172a; margin:0 0 10px 0; }
    .subtitle { font-size:15px; color:#374151; margin:0 0 16px 0; }
    .content-image { text-align:center; margin:20px 0; }
    .content-image img { width:100%; max-height:360px; object-fit:cover; border-radius:6px; }
    .description { font-size:15px; color:#475569; line-height:1.6; }
    .read-btn { display:inline-block; margin-top:18px; background:#0070f3; color:#fff; padding:12px 22px; border-radius:6px; text-decoration:none; font-weight:600; }
    .read-btn:hover { background:#005bd8; }
    .footer { padding:18px 24px; font-size:13px; color:#6b7280; border-top:1px solid #eef2f6; text-align:center; }
    .footer a { color:#0070f3; text-decoration:none; }
    @media screen and (max-width:600px) { .container { margin:0 12px; } .topbar { padding:12px; } .hero { padding:16px; } }
  </style>
</head>
<body>
  <div class="container">
      <div class="topbar">
        <img class="logo" src="https://www.miningdiscovery.com/image/mining-discovery-logo-1.png" alt="Mining Discovery" />
        <div class="brand">Mining Discovery</div>
      </div>

      <div class="meta">
        <div class="left">${short_description || ''}</div>
        <div class="right">${newsData.author || ''} ${newsData.publish_on ? ' | ' + new Date(newsData.publish_on).toLocaleDateString() : ''}</div>
      </div>

      <div class="hero">
        <div class="title">${title || 'News Update'}</div>
        ${imageUrl ? `<div class="content-image"><img src="${imageUrl}" alt="${title}" /></div>` : ''}
        <div class="description">${description || descriptionText || ''}</div>
        <a class="read-btn" href="${articleUrl}">Read Full Story</a>
      </div>

      <div class="footer">
        <div>&copy; ${new Date().getFullYear()} Mining Discovery. All rights reserved.</div>
        <div style="margin-top:8px;font-size:12px;color:#94a3b8;">You received this email because you subscribed to Mining Discovery news.</div>
        <div style="margin-top:8px;"><a href="*|UNSUB|*">Unsubscribe</a> | <a href="*|UPDATE_PROFILE|*">Update Preferences</a></div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Send campaign to Mailchimp
 * @param {Object} newsData - News section data
 * @returns {Promise<Object>} - Result with campaignId or error
 */
async function sendCampaignToMailchimp(newsData) {
  try {
    if (!process.env.MAILCHIMP_API_KEY || !process.env.MAILCHIMP_AUDIENCE_ID) {
      throw new Error('Missing Mailchimp configuration');
    }

    console.log('[MAILCHIMP] Initializing Mailchimp client...');
    const client = initializeMailchimp();

    const campaignContent = {
      type: 'regular',
      recipients: {
        list_id: process.env.MAILCHIMP_AUDIENCE_ID,
      },
      settings: {
        subject_line: newsData.title,
        preview_text: newsData.short_description || newsData.title,
        from_name: 'Mining Discovery',
        reply_to: process.env.MAILCHIMP_REPLY_EMAIL || 'noreply@miningdiscovery.com',
      },
    };

    console.log('[MAILCHIMP] Creating campaign:', newsData.title);
    const campaign = await client.campaigns.create(campaignContent);
    console.log('[MAILCHIMP] ✓ Campaign created:', campaign.id);

    const htmlContent = generateNewsEmailTemplate(newsData);
    console.log('[MAILCHIMP] Setting HTML content...');
    await client.campaigns.setContent(campaign.id, { html: htmlContent });
    console.log('[MAILCHIMP] ✓ HTML content set');

    console.log('[MAILCHIMP] ✓ Campaign ready as draft in Mailchimp dashboard');
    console.log('[MAILCHIMP] Campaign ID:', campaign.id);

    return {
      success: true,
      campaignId: campaign.id,
      message: 'Campaign created as draft in Mailchimp',
    };
  } catch (error) {
    console.error('[MAILCHIMP] ✗ Error:', error.message);
    throw error;
  }
}

module.exports = {
  initializeMailchimp,
  generateNewsEmailTemplate,
  sendCampaignToMailchimp,
};
