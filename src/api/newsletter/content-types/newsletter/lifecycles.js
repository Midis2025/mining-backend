"use strict";

const crypto = require("crypto");
const mailchimp = require("@mailchimp/mailchimp_marketing");

const MC_API_KEY = process.env.MAILCHIMP_API_KEY;
const MC_SERVER_PREFIX = process.env.MAILCHIMP_SERVER_PREFIX; // e.g. "us21"
const MC_AUDIENCE_ID = process.env.MAILCHIMP_AUDIENCE_ID;

// Log warning if misconfigured
if (!MC_API_KEY || !MC_SERVER_PREFIX || !MC_AUDIENCE_ID) {
  console.warn(
    "[mailchimp] Missing env: MAILCHIMP_API_KEY / MAILCHIMP_SERVER_PREFIX / MAILCHIMP_AUDIENCE_ID"
  );
}

mailchimp.setConfig({ apiKey: MC_API_KEY, server: MC_SERVER_PREFIX });

// Helper: upsert subscriber by email
async function upsertToMailchimp(entry) {
  const raw = (entry?.email || "").trim().toLowerCase();
  if (!raw) return; // skip if no email

  const listId = MC_AUDIENCE_ID;
  const subscriberHash = crypto.createHash("md5").update(raw).digest("hex");

  await mailchimp.lists.setListMember(listId, subscriberHash, {
    email_address: raw,
    status_if_new: "subscribed", // auto-subscribe new users
  });
}

module.exports = {
  async afterCreate(event) {
    try {
      await upsertToMailchimp(event.result);
      strapi.log.info(`[mailchimp] subscribed: ${event.result?.email}`);
    } catch (err) {
      strapi.log.error(
        `[mailchimp] subscribe failed: ${event.result?.email} :: ${
          err.response?.text || err.message
        }`
      );
    }
  },

  async afterUpdate(event) {
    try {
      await upsertToMailchimp(event.result);
      strapi.log.info(`[mailchimp] updated: ${event.result?.email}`);
    } catch (err) {
      strapi.log.error(
        `[mailchimp] update failed: ${event.result?.email} :: ${
          err.response?.text || err.message
        }`
      );
    }
  },
};
