'use strict';

const mailchimp = require('@mailchimp/mailchimp_marketing');
const dns = require('dns');

// Fix for Node.js DNS resolution issues on some machines
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const axios = require('axios');

// Fallback to Google DNS if local resolution fails
if (dns.setServers) {
  try {
    dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
    console.log('[MAILCHIMP] DNS: Google/Cloudflare servers configured for fallback');
  } catch (e) {
    console.warn('[MAILCHIMP] DNS: Failed to set custom servers:', e.message);
  }
}

/**
 * Initialize Mailchimp client
 */
async function initializeMailchimp() {
  const apiKey = (process.env.MAILCHIMP_API_KEY || '').trim();
  const server = (process.env.MAILCHIMP_SERVER_PREFIX || process.env.MAILCHIMP_SERVER || '').trim();

  // Pre-flight DNS diagnostics
  const domain = `${server}.api.mailchimp.com`;
  console.log('[MAILCHIMP] Checking DNS for:', domain);
  try {
    const addresses = await new Promise((resolve, reject) => {
      dns.resolve4(domain, (err, addrs) => (err ? reject(err) : resolve(addrs)));
    });
    console.log('[MAILCHIMP] ✓ DNS Resolved successfully:', addresses[0]);
  } catch (dnsErr) {
    console.error('[MAILCHIMP] ✗ DNS RESOLUTION FAILED:', dnsErr.message);
    console.error('[MAILCHIMP] Possible causes: Network down, Firewall blocking Mailchimp, or improper Windows DNS settings.');
  }

  // Connectivity Test
  const testUrl = `https://${domain}/3.0/`;
  console.log('[MAILCHIMP] Testing connectivity to:', testUrl);
  try {
    const res = await axios.get(testUrl, {
      headers: { Authorization: `apikey ${apiKey}` },
      timeout: 8000
    });
    console.log('[MAILCHIMP] ✓ Connectivity test successful:', res.status);
  } catch (err) {
    console.warn('[MAILCHIMP] ⚠️ Connectivity test warning:', err.message);
  }

  const maskedKey = apiKey ? `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}` : 'MISSING';
  console.log('[MAILCHIMP] init - API key:', maskedKey, 'server:', server ? server : 'MISSING');

  mailchimp.setConfig({
    apiKey,
    server,
  });
  return mailchimp;
}

/**
 * Resolve image URL from Strapi image object or plain string.
 */
function resolveImageUrl(img) {
  const baseUrl = process.env.FRONTEND_URL || 'https://www.miningdiscovery.com';
  const mediaBase = process.env.STRAPI_URL || baseUrl;

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

/**
 * Fetch latest published news from Strapi (excluding the current article)
 */
async function fetchLatestNews(excludeDocumentId, limit = 8) {
  try {
    console.log('[MAILCHIMP] Fetching latest news... excluding documentId:', excludeDocumentId);

    // Debug: fetch all to see what's available
    const allItems = await strapi.documents('api::news-section.news-section').findMany({ limit: 5 });
    console.log(`[MAILCHIMP] DEBUG: Total items in news-section (any status): ${allItems?.length || 0}`);
    if (allItems?.length > 0) {
      console.log(`[MAILCHIMP] DEBUG: Sample item IDs:`, allItems.map(i => ({ id: i.id, docId: i.documentId, status: i.status })));
    }

    const results = await strapi.documents('api::news-section.news-section').findMany({
      status: 'published',
      filters: {
        ...(excludeDocumentId ? { documentId: { $ne: excludeDocumentId } } : {}),
      },
      sort: 'publish_on:desc',
      limit,
      fields: ['title', 'publish_on', 'author'],
    });
    console.log(`[MAILCHIMP] ✓ Found ${results?.length || 0} latest news items`);
    return results || [];
  } catch (err) {
    console.error('[MAILCHIMP] ✗ Error fetching latest news:', err.message);
    return [];
  }
}

/**
 * Fetch published advertisements from Strapi
 */
async function fetchAdvertisements(limit = 4) {
  try {
    console.log('[MAILCHIMP] Fetching advertisements...');

    // Debug: fetch all
    const allAds = await strapi.documents('api::advertisement.advertisement').findMany({ limit: 5 });
    console.log(`[MAILCHIMP] DEBUG: Total items in advertisement (any status): ${allAds?.length || 0}`);

    const results = await strapi.documents('api::advertisement.advertisement').findMany({
      status: 'published',
      populate: ['ads_image'],
      limit,
    });
    console.log(`[MAILCHIMP] ✓ Found ${results?.length || 0} advertisements`);
    return results || [];
  } catch (err) {
    console.error('[MAILCHIMP] ✗ Error fetching advertisements:', err.message);
    return [];
  }
}

/**
 * Generate HTML email template for news – Mining Weekly style 3-column layout
 * Left: Ad banners | Center: Main article | Right: Latest news
 */
function generateNewsEmailTemplate(newsData, latestNews = [], advertisements = []) {
  const {
    title,
    short_description,
    description,
    image,
    slug,
  } = newsData;

  const slugify = require('slugify');
  const slugFn = typeof slugify === 'function' ? slugify : slugify.default;
  const slugValue = slug || slugFn(title || 'news', { lower: true, strict: true });
  const baseUrl = process.env.FRONTEND_URL || 'https://www.miningdiscovery.com';
  const imageUrl = resolveImageUrl(image);

  const articleId = newsData.id || newsData._id || '';
  const articleUrl = articleId
    ? `${baseUrl}/page/article/${slugValue}?id=${articleId}`
    : `${baseUrl}/news/${slugValue}`;

  // Format the publish date
  const publishDate = newsData.publish_on
    ? new Date(newsData.publish_on).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // Build advertisement banners HTML for the left column
  let adBannersHtml = '';
  if (advertisements.length > 0) {
    advertisements.forEach((ad) => {
      const adImgUrl = resolveImageUrl(ad.ads_image);
      const adLink = ad.ad_url || '#';
      const adAlt = ad.alt_text || 'Advertisement';
      if (adImgUrl) {
        adBannersHtml += `
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:12px;">
            <tr>
              <td align="center">
                <a href="${adLink}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">
                  <img src="${adImgUrl}" alt="${adAlt}" width="160" style="display:block;width:160px;max-width:100%;height:auto;border-radius:6px;border:0;" />
                </a>
              </td>
            </tr>
          </table>`;
      }
    });
  }

  // If no ads, show a placeholder
  if (!adBannersHtml) {
    adBannersHtml = `
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:12px;">
        <tr>
          <td align="center" style="padding:20px 10px;background:#f8f9fa;border-radius:6px;">
            <a href="${baseUrl}/page/services" target="_blank" style="text-decoration:none;color:#b8863a;font-size:12px;font-weight:600;">
              Advertise Here
            </a>
          </td>
        </tr>
      </table>`;
  }

  // Build latest news HTML for the right column
  let latestNewsHtml = '';
  if (latestNews.length > 0) {
    latestNews.forEach((news) => {
      const newsUrl = news.id
        ? `${baseUrl}/page/article/${news.slug}?id=${news.id}`
        : `${baseUrl}/news/${news.slug}`;
      const newsDate = news.publish_on
        ? new Date(news.publish_on).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : '';
      latestNewsHtml += `
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:0;">
          <tr>
            <td style="padding:10px 12px;border-bottom:1px solid #eef0f3;">
              <a href="${newsUrl}" target="_blank" style="text-decoration:none;color:#1a1a2e;font-size:13px;font-weight:600;line-height:1.4;display:block;">
                ${news.title}
              </a>
              <div style="font-size:11px;color:#8c8c8c;margin-top:4px;">
                ${newsDate}${news.author ? ' By: ' + news.author : ' By: Mining Discovery'}
              </div>
            </td>
          </tr>
        </table>`;
    });
  } else {
    latestNewsHtml = `
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding:16px 12px;color:#8c8c8c;font-size:13px;text-align:center;">
            No recent news available
          </td>
        </tr>
      </table>`;
  }

  return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title || 'Mining Discovery News'}</title>
  <!--[if mso]>
  <style type="text/css">
    table { border-collapse: collapse; }
    .fallback-font { font-family: Arial, sans-serif; }
  </style>
  <![endif]-->
  <style type="text/css">
    /* Reset */
    body, table, td, p, a, li { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; background-color: #f0f2f5; }
    
    /* Typography */
    .body-text { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
    
    /* Mobile responsive */
    @media only screen and (max-width: 680px) {
      .email-wrapper { width: 100% !important; }
      .main-table { width: 100% !important; }
      .left-ads { display: none !important; width: 0 !important; max-height: 0 !important; overflow: hidden !important; mso-hide: all !important; }
      .right-news { width: 100% !important; display: block !important; }
      .center-content { width: 100% !important; display: block !important; }
      .mobile-full { width: 100% !important; display: block !important; }
      .mobile-hide { display: none !important; }
      .mobile-padding { padding: 12px !important; }
      .article-image { width: 100% !important; height: auto !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f0f2f5;" class="body-text">
  <!-- Preheader text (hidden) -->
  <div style="display:none;font-size:1px;color:#f0f2f5;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${short_description || title || 'Latest mining news from Mining Discovery'}
  </div>

  <!-- Full-width wrapper -->
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f0f2f5;">
    <tr>
      <td align="center" style="padding:0;">

        <!-- ====== HEADER WITH LOGO ====== -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="960" class="email-wrapper" style="max-width:960px;width:100%;">
          <tr>
            <td style="padding:0;">
              <!-- Top ticker bar -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#1a1a2e;">
                <tr>
                  <td style="padding:8px 20px;text-align:center;">
                    <span style="color:#d4a843;font-size:11px;font-weight:600;letter-spacing:0.5px;">
                     Mining Discovery - Your Source for Global Mining News
                    </span>
                  </td>
                </tr>
              </table>
              <!-- Logo bar -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#ffffff;border-bottom:3px solid #d4a843;">
                <tr>
                  <td style="padding:16px 24px;" align="left" valign="middle">
                    <a href="${baseUrl}" target="_blank" style="text-decoration:none;">
                      <img src="https://www.miningdiscovery.com/image/mining-discovery-logo-1.png" alt="Mining Discovery" width="200" height="62" style="display:block;border:0;outline:none;max-width:200px;height:auto;" />
                    </a>
                  </td>
                  <td style="padding:16px 24px;" align="right" valign="middle">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:0 8px;">
                          <a href="${baseUrl}" target="_blank" style="color:#1a1a2e;text-decoration:none;font-size:13px;font-weight:600;">Home</a>
                        </td>
                        <td style="padding:0 8px;">
                          <a href="${baseUrl}/page/latest-news" target="_blank" style="color:#1a1a2e;text-decoration:none;font-size:13px;font-weight:600;">News</a>
                        </td>
                        <td style="padding:0 8px;">
                          <a href="${baseUrl}/page/evening-chatter" target="_blank" style="color:#1a1a2e;text-decoration:none;font-size:13px;font-weight:600;">Evening Chatter</a>
                        </td>
                        <td style="padding:0 8px;">
                          <a href="${baseUrl}/page/about-us" target="_blank" style="color:#1a1a2e;text-decoration:none;font-size:13px;font-weight:600;">About</a>
                        </td>
                        <td style="padding:0 8px;">
                          <a href="${baseUrl}/page/contact-us" target="_blank" style="color:#1a1a2e;text-decoration:none;font-size:13px;font-weight:600;">Contact</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- ====== DATE BAR ====== -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="960" class="email-wrapper" style="max-width:960px;width:100%;">
          <tr>
            <td style="background-color:#f8f9fb;padding:10px 24px;border-bottom:1px solid #e8ecf1;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="font-size:12px;color:#6b7280;font-weight:600;">
                    ${publishDate}
                  </td>
                  <td align="right" style="font-size:12px;color:#6b7280;">
                    <!-- Date section only -->
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- ====== MAIN 3-COLUMN LAYOUT ====== -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="960" class="email-wrapper main-table" style="max-width:960px;width:100%;background-color:#ffffff;">
          <tr>
            <!-- ===== LEFT COLUMN – AD BANNERS ===== -->
            <td class="left-ads" width="180" valign="top" style="width:180px;background-color:#f8f9fb;border-right:1px solid #eef0f3;padding:16px 10px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding-bottom:10px;">
                    <div style="font-size:10px;color:#999;font-weight:700;letter-spacing:1px;text-transform:uppercase;text-align:center;padding-bottom:8px;border-bottom:2px solid #d4a843;margin-bottom:12px;">
                      Sponsors
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>
                    ${adBannersHtml}
                  </td>
                </tr>
              </table>
            </td>

            <!-- ===== CENTER COLUMN – MAIN ARTICLE ===== -->
            <td class="center-content mobile-full" valign="top" style="background-color:#ffffff;padding:0;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <!-- Article hero image -->
                ${imageUrl ? `
                <tr>
                  <td style="padding:20px 24px 0 24px;">
                    <a href="${articleUrl}" target="_blank" style="text-decoration:none;">
                      <img src="${imageUrl}" alt="${title}" class="article-image" width="100%" style="display:block;width:100%;max-height:380px;object-fit:cover;border-radius:6px;border:0;" />
                    </a>
                  </td>
                </tr>` : ''}

                <!-- Article title -->
                <tr>
                  <td style="padding:20px 24px 0 24px;">
                    <h1 style="margin:0;padding:0;font-size:24px;font-weight:800;color:#1a1a2e;line-height:1.3;">
                      <a href="${articleUrl}" target="_blank" style="text-decoration:none;color:#1a1a2e;">
                        ${title || 'News Update'}
                      </a>
                    </h1>
                  </td>
                </tr>

                <!-- Divider line -->
                <tr>
                  <td style="padding:14px 24px 0 24px;">
                    <div style="height:2px;background:linear-gradient(90deg,#d4a843,#e8d5a8);border-radius:1px;" aria-hidden="true"></div>
                  </td>
                </tr>

                <!-- Article description (Truncated) -->
                <tr>
                  <td style="padding:16px 24px 8px 24px;font-size:15px;color:#374151;line-height:1.75;">
                    ${(description || short_description || '').substring(0, 500)}...
                    <div style="margin-top:20px;">
                      <a href="${articleUrl}" target="_blank" style="display:inline-block;background:#d4a843;color:#ffffff;padding:12px 28px;border-radius:25px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:0.5px;box-shadow:0 4px 6px rgba(184,134,58,0.2);">
                        READ FULL ARTICLE →
                      </a>
                    </div>
                  </td>
                </tr>

                <!-- Article meta -->
                <tr>
                  <td style="padding:12px 24px 25px 24px;">
                    <div style="font-size:13px;color:#8c8c8c;">
                      ${publishDate} &nbsp;|&nbsp; Mining Discovery
                    </div>
                  </td>
                </tr>
              </table>
            </td>

            <!-- ===== RIGHT COLUMN – LATEST NEWS ===== -->
            <td class="right-news mobile-full" width="250" valign="top" style="width:250px;background-color:#fafbfc;border-left:1px solid #eef0f3;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <!-- Latest News header -->
                <tr>
                  <td style="padding:18px 14px 10px 14px;">
                    <div style="font-size:18px;font-weight:800;color:#1a1a2e;text-align:center;letter-spacing:0.3px;">
                      Latest News
                    </div>
                    <div style="height:3px;background:#d4a843;border-radius:2px;margin-top:8px;" aria-hidden="true"></div>
                  </td>
                </tr>
                <!-- News items -->
                <tr>
                  <td style="padding:0;">
                    ${latestNewsHtml}
                  </td>
                </tr>
                <!-- View all link -->
                <tr>
                  <td style="padding:14px 12px 18px 12px;text-align:center;">
                    <a href="${baseUrl}/page/latest-news" target="_blank" style="display:inline-block;background:#d4a843;color:#ffffff;padding:10px 22px;border-radius:20px;text-decoration:none;font-weight:700;font-size:12px;letter-spacing:0.5px;">
                      VIEW ALL NEWS →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- ====== FEATURED EVENT BANNER ====== -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="960" class="email-wrapper" style="max-width:960px;width:100%;background-color:#ffffff;border-top:3px solid #d4a843;">
          <tr>
            <td style="padding:20px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom:12px;">
                    <div style="font-size:11px;color:#8c8c8c;font-weight:700;letter-spacing:2px;text-transform:uppercase;">
                      FEATURED EVENT
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f8f9fb;border-radius:8px;overflow:hidden;">
                      <tr>
                        <td width="40%" style="padding:0;" valign="top">
                          <a href="https://www.themininginvestmentevent.com/" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">
                            <img src="https://acceptable-desire-0cca5bb827.media.strapiapp.com/large_THE_Mining_Investment_Event_2026_1_converted_b65a966501.webp" alt="The Mining Investment Event" width="100%" style="display:block;width:100%;height:auto;border:0;border-radius:8px 0 0 8px;" />
                          </a>
                        </td>
                        <td width="60%" style="padding:18px 20px;" valign="middle">
                          <div style="font-size:16px;font-weight:700;color:#1a1a2e;margin-bottom:8px;">The Mining Investment Event</div>
                          <div style="font-size:13px;color:#555;line-height:1.5;margin-bottom:14px;">
                            Canada's Only Tier I Global Mining Investment Conference. Over 100 participating mining companies, bringing together investors and authorities.
                          </div>
                          <a href="https://www.themininginvestmentevent.com/register" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#d4a843;color:#ffffff;padding:10px 20px;border-radius:20px;text-decoration:none;font-weight:700;font-size:12px;">
                            Register Now →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- ====== FOOTER ====== -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="960" class="email-wrapper" style="max-width:960px;width:100%;background-color:#1a1a2e;">
          <tr>
            <td style="padding:28px 24px;text-align:center;">
              <!-- Logo in footer -->
              <a href="${baseUrl}" target="_blank" style="text-decoration:none;">
                <img src="https://www.miningdiscovery.com/image/mining-discovery-logo-1.png" alt="Mining Discovery" width="160" style="display:inline-block;border:0;outline:none;max-width:160px;height:auto;margin-bottom:16px;" />
              </a>
              <!-- Social links -->
              <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 14px auto;">
                <tr>
                  <td style="padding:0 5px;">
                    <a href="https://www.linkedin.com/company/miningdiscovery/posts/?feedView=all" target="_blank" style="display:inline-block;width:32px;height:32px;line-height:32px;border-radius:50%;background:#d4a843;color:#ffffff;text-decoration:none;font-weight:700;font-size:12px;text-align:center;">in</a>
                  </td>
                  <td style="padding:0 5px;">
                    <a href="https://x.com/MiningDiscovery" target="_blank" style="display:inline-block;width:32px;height:32px;line-height:32px;border-radius:50%;background:#d4a843;color:#ffffff;text-decoration:none;font-weight:700;font-size:12px;text-align:center;">X</a>
                  </td>
                  <td style="padding:0 5px;">
                    <a href="https://www.instagram.com/miningdiscovery" target="_blank" style="display:inline-block;width:32px;height:32px;line-height:32px;border-radius:50%;background:#d4a843;color:#ffffff;text-decoration:none;font-weight:700;font-size:12px;text-align:center;">ig</a>
                  </td>
                  <td style="padding:0 5px;">
                    <a href="https://www.youtube.com/@miningdiscovery?themeRefresh=1" target="_blank" style="display:inline-block;width:32px;height:32px;line-height:32px;border-radius:50%;background:#d4a843;color:#ffffff;text-decoration:none;font-weight:700;font-size:12px;text-align:center;">YT</a>
                  </td>
                  <td style="padding:0 5px;">
                    <a href="https://www.facebook.com/login.php?next=https%3A%2F%2Fwww.facebook.com%2Fconfirmemail.php%3Fnext%3Dhttps%253A%252F%252Fwww.facebook.com%252Fgetminingnews" target="_blank" style="display:inline-block;width:32px;height:32px;line-height:32px;border-radius:50%;background:#d4a843;color:#ffffff;text-decoration:none;font-weight:700;font-size:12px;text-align:center;">f</a>
                  </td>
                </tr>
              </table>
              <!-- Copyright -->
              <div style="font-size:12px;color:#8c9ab0;margin-bottom:6px;">
                &copy; ${new Date().getFullYear()} Mining Discovery. All rights reserved.
              </div>
              <div style="font-size:11px;color:#6b7b94;margin-bottom:10px;">
                You received this email because you subscribed to Mining Discovery news.
              </div>
              <div style="font-size:12px;">
                <a href="*|UNSUB|*" style="color:#d4a843;text-decoration:underline;">Unsubscribe</a>
                &nbsp;&nbsp;|&nbsp;&nbsp;
                <a href="*|UPDATE_PROFILE|*" style="color:#d4a843;text-decoration:underline;">Update Preferences</a>
              </div>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
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
    const client = await initializeMailchimp();

    // Fetch dynamic content for the email template
    console.log('[MAILCHIMP] Fetching latest news and advertisements...');
    const [latestNews, advertisements] = await Promise.all([
      fetchLatestNews(newsData.documentId || null, 8),
      fetchAdvertisements(4),
    ]);
    console.log(`[MAILCHIMP] ✓ Fetched ${latestNews.length} latest news, ${advertisements.length} ads`);

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

    const htmlContent = generateNewsEmailTemplate(newsData, latestNews, advertisements);
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
  fetchLatestNews,
  fetchAdvertisements,
};
