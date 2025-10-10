"use strict";

const crypto = require("crypto");
const mailchimp = require("@mailchimp/mailchimp_marketing");

const MC_API_KEY = process.env.MAILCHIMP_API_KEY;
const MC_SERVER_PREFIX = process.env.MAILCHIMP_SERVER_PREFIX;
const MC_AUDIENCE_ID = process.env.MAILCHIMP_AUDIENCE_ID;
const MC_DOUBLE_OPTIN = process.env.MAILCHIMP_DOUBLE_OPTIN === "true";
const MC_DEFAULT_TAGS = (process.env.MAILCHIMP_DEFAULT_TAGS || "website,newsletter")
  .split(",")
  .map((t) => t.trim());

// Log warning if misconfigured
if (!MC_API_KEY || !MC_SERVER_PREFIX || !MC_AUDIENCE_ID) {
  console.warn(
    "[Mailchimp] Missing env vars: MAILCHIMP_API_KEY / MAILCHIMP_SERVER_PREFIX / MAILCHIMP_AUDIENCE_ID"
  );
}

mailchimp.setConfig({
  apiKey: MC_API_KEY,
  server: MC_SERVER_PREFIX,
});

/**
 * Upserts a subscriber into Mailchimp
 */
async function upsertToMailchimp(entry) {
  const email = (entry?.email || "").trim().toLowerCase();
  if (!email) {
    strapi.log.warn("[Mailchimp] Skipping – no email found in entry");
    return;
  }

  const listId = MC_AUDIENCE_ID;
  const subscriberHash = crypto.createHash("md5").update(email).digest("hex");

  const payload = {
    email_address: email,
    status_if_new: MC_DOUBLE_OPTIN ? "pending" : "subscribed",
    tags: MC_DEFAULT_TAGS,
  };

  // Try adding/updating the contact
  try {
    const response = await mailchimp.lists.setListMember(listId, subscriberHash, payload);
    strapi.log.info(`[Mailchimp] ✅ Synced subscriber: ${email} (${response.status})`);
  } catch (err) {
    const msg = err.response?.text || err.message;
    strapi.log.error(`[Mailchimp] ❌ Failed to sync ${email}: ${msg}`);
  }
}

module.exports = {
  async afterCreate(event) {
    await upsertToMailchimp(event.result);
  },

  async afterUpdate(event) {
    await upsertToMailchimp(event.result);
  },
};
