'use strict';

const mailchimp = require('@mailchimp/mailchimp_marketing');

/**
 * Initialize Mailchimp client
 */
function initializeMailchimp() {
  const apiKey = process.env.MAILCHIMP_API_KEY || '';
  const server = process.env.MAILCHIMP_SERVER_PREFIX || process.env.MAILCHIMP_SERVER || '';

  const maskedKey = apiKey ? `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}` : 'MISSING';
  console.log('[MAILCHIMP] init - API key:', maskedKey, 'server:', server ? server : 'MISSING');

  mailchimp.setConfig({
    apiKey,
    server,
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
  // Use STRAPI_URL for media if provided (images are served by the Strapi backend).
  const mediaBase = process.env.STRAPI_URL || baseUrl;

  // Resolve image URL from Strapi image object or plain string.
  // Prefer formatted versions (medium -> large -> small -> thumbnail), fall back to top-level `url`.
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
    /* Read button removed per request */
    .banner { padding:12px 24px; text-align:center; border-top:1px solid #eef2f6; margin-top:18px; padding-top:18px; }
    .banner img { width:100%; max-height:150px; object-fit:cover; border-radius:6px; display:block; }
    .banner-desc { font-size:14px; color:#374151; margin-bottom:12px; text-align:left; line-height:1.5; }
    .cta { display:inline-block; background:#0070f3; color:#ffffff; padding:10px 18px; border-radius:6px; text-decoration:none; font-weight:700; margin-top:12px; }
    .cta:hover { opacity:0.95; }
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
        ${imageUrl ? `<div class="content-image"><img src="${imageUrl}" alt="${title}" style="width:100%;max-height:360px;object-fit:cover;border-radius:6px;display:block;" width="700"/></div>` : ''}
        <div class="description">${description || descriptionText || ''}</div>
        <div class="banner">
          <div class="banner-desc">THE Mining Investment EVENT is Canada’s Only Tier I Global Mining Investment Conference, held annually in Québec City, Canada. THE Event hosts over 100 participating mining companies, is invitation only and is independently sponsored by the Government of Québec, and financial and mining communities at large. It is designed to specifically facilitate privately arranged meetings between mining companies, international investors, and various mining government authorities. THE Event is committed to promoting sustainability in the mining industry via education and innovation through its unique Student Sponsorship and SHE-Co Initiatives, highlighting ESG and equality issues, and providing a platform for some of the most influential thought leaders in the sector.</div>
          <a href="https://www.themininginvestmentevent.com/" target="_blank" rel="noopener noreferrer">
            <img src="https://acceptable-desire-0cca5bb827.media.strapiapp.com/VID_Conference_64f8816fff.avif" alt="The Mining Investment Event" />
          </a>
          <div style="margin-top:12px;">
            <a class="cta" href="https://www.themininginvestmentevent.com/register" target="_blank" rel="noopener noreferrer">Register Now</a>
          </div>
        </div>
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
    let campaign;
    try {
      campaign = await client.campaigns.create(campaignContent);
      console.log('[MAILCHIMP] ✓ Campaign created:', campaign.id);
    } catch (err) {
      console.error('[MAILCHIMP] ✗ Mailchimp SDK create error:', err.response?.body || err.message || err);
      throw err;
    }

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
    console.error('[MAILCHIMP] ✗ Error:', error.response?.body || error.message || error);
    throw error;
  }
}

module.exports = {
  initializeMailchimp,
  generateNewsEmailTemplate,
  sendCampaignToMailchimp,
};
