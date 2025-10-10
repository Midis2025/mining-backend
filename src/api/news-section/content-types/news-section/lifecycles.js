"use strict";

const mailchimp = require("@mailchimp/mailchimp_marketing");

// Environment variables
const MC_API_KEY = process.env.MAILCHIMP_API_KEY;
const MC_SERVER_PREFIX = process.env.MAILCHIMP_SERVER_PREFIX; // e.g., "us21"
const MC_AUDIENCE_ID = process.env.MAILCHIMP_AUDIENCE_ID;
const STRAPI_BASE_URL = process.env.STRAPI_BASE_URL || "https://admins.miningdiscovery.com";
const MOCK_MAILCHIMP = process.env.MOCK_MAILCHIMP === "true"; // Optional test mode

// Configure Mailchimp SDK
mailchimp.setConfig({
  apiKey: MC_API_KEY,
  server: MC_SERVER_PREFIX,
});

/**
 * Send a "News Update" campaign to Mailchimp
 * If MOCK_MAILCHIMP is true or API is unreachable, logs a mock instead
 */
async function sendNewsUpdateCampaign(news) {
  const { title, short_description: summary, slug } = news; // adjust field name
  const newsUrl = `${STRAPI_BASE_URL}/news/${slug}`;

  // Mock mode: skip real sending
  if (MOCK_MAILCHIMP) {
    strapi.log.info(`[Mailchimp MOCK] Campaign would have been sent for: ${title}`);
    return;
  }

  try {
    // Test connectivity first
    await mailchimp.ping.get();

    // 1️⃣ Create a new campaign
    const campaign = await mailchimp.campaigns.create({
      type: "regular",
      recipients: { list_id: MC_AUDIENCE_ID },
      settings: {
        subject_line: `📰 ${title}`,
        title: `News Update – ${title}`,
        from_name: "Mining Discovery",
        reply_to: "info@miningdiscovery.com",
      },
    });

    if (!campaign || !campaign.id) {
      strapi.log.warn(`[Mailchimp] ⚠ Campaign creation failed for: ${title}`);
      return;
    }

    const campaignId = campaign.id;

    // 2️⃣ Set campaign content
    await mailchimp.campaigns.setContent(campaignId, {
      html: `
        <div style="font-family: Arial, sans-serif; color: #222;">
          <h2>${title}</h2>
          <p>${summary || ""}</p>
          <p><a href="${newsUrl}" target="_blank" style="color: #0073aa;">Read the full article →</a></p>
          <hr/>
          <p style="font-size: 12px; color: #666;">
            You're receiving this because you subscribed to Mining Discovery updates.
          </p>
        </div>
      `,
    });

    // 3️⃣ Send the campaign
    await mailchimp.campaigns.send(campaignId);

    strapi.log.info(`[Mailchimp] 📤 Sent "News Update" campaign for: ${title}`);
  } catch (err) {
    // Mailchimp unreachable or error
    strapi.log.warn(`[Mailchimp MOCK] Unable to reach Mailchimp. Campaign would have been sent for: ${title}`);
    strapi.log.warn(`[Mailchimp MOCK] Error: ${err.response?.body || err.message}`);
  }
}

module.exports = {
  /**
   * Lifecycle: after creating a new news article
   */
  async afterCreate(event) {
    const news = event.result;

    try {
      await sendNewsUpdateCampaign(news);
    } catch (err) {
      strapi.log.error(`[Mailchimp] ❌ Error in lifecycle: ${err.message}`);
    }
  },
};
