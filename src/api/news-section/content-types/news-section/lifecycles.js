"use strict";

const mailchimp = require("@mailchimp/mailchimp_marketing");

const MC_API_KEY = process.env.MAILCHIMP_API_KEY;
const MC_SERVER_PREFIX = process.env.MAILCHIMP_SERVER_PREFIX;
const MC_AUDIENCE_ID = process.env.MAILCHIMP_AUDIENCE_ID;
const STRAPI_BASE_URL = process.env.STRAPI_BASE_URL || "https://admins.miningdiscovery.com";
const MOCK_MAILCHIMP = process.env.MOCK_MAILCHIMP === "true";
const MC_TEMPLATE_ID = 10574722; // <-- Your real Mailchimp template ID

mailchimp.setConfig({
  apiKey: MC_API_KEY,
  server: MC_SERVER_PREFIX,
});

async function sendNewsUpdateCampaign(news) {
  const {
    id,
    title,
    short_description,
    description,
    publish_on,
    image_url,
  } = news;

  const newsUrl = `${STRAPI_BASE_URL}/news/${id}`;

  if (MOCK_MAILCHIMP) {
    strapi.log.info(`[Mailchimp MOCK] Would send campaign for: ${title}`);
    return;
  }

  try {
    await mailchimp.ping.get();

    // 1️⃣ Create a new campaign
    const campaign = await mailchimp.campaigns.create({
      type: "regular",
      recipients: { list_id: MC_AUDIENCE_ID },
      settings: {
        subject_line: `📰 ${title}`,
        title: `News Update – ${title}`,
        from_name: "Mining Discovery",
        reply_to: "midisresourcespvtltd@gmail.com",
        template_id: MC_TEMPLATE_ID,
      },
    });

    if (!campaign || !campaign.id) {
      strapi.log.warn(`[Mailchimp] ⚠ Failed to create campaign for: ${title}`);
      return;
    }

    const campaignId = campaign.id;

    // 2️⃣ Fill in template placeholders
    await mailchimp.campaigns.setContent(campaignId, {
      template: {
        id: MC_TEMPLATE_ID,
        sections: {
          NEWS_TITLE: title,
          NEWS_SHORT_DESC: short_description || "",
          NEWS_DESCRIPTION: description || "",
          NEWS_ID: id.toString(),
          NEWS_IMAGE_URL: image_url || "https://miningdiscovery.com/default-news-image.png",
          PUBLISH_DATE: publish_on || new Date().toISOString().split("T")[0],
        },
      },
    });

    // 3️⃣ Send campaign
    await mailchimp.campaigns.send(campaignId);

    strapi.log.info(`[Mailchimp] 📤 Sent 'News Update' campaign for: ${title}`);
  } catch (err) {
    strapi.log.error(`[Mailchimp] ❌ Error sending campaign for ${news.title}: ${err.message}`);
    strapi.log.error(err.response?.body || err);
  }
}

module.exports = {
  async afterCreate(event) {
    const news = event.result;

    try {
      await sendNewsUpdateCampaign(news);
    } catch (err) {
      strapi.log.error(`[Mailchimp] ❌ Lifecycle error: ${err.message}`);
    }
  },
};
