"use strict";

const crypto = require("crypto");
const mailchimp = require("@mailchimp/mailchimp_marketing");

const MC_API_KEY = process.env.MAILCHIMP_API_KEY;
const MC_SERVER_PREFIX = process.env.MAILCHIMP_SERVER_PREFIX; // e.g. "us21"
const MC_AUDIENCE_ID = process.env.MAILCHIMP_AUDIENCE_ID;

// Basic safety: log once if misconfigured
if (!MC_API_KEY || !MC_SERVER_PREFIX || !MC_AUDIENCE_ID) {
  // This logs at boot; check Strapi Cloud logs
  console.warn("[mailchimp] Missing env: MAILCHIMP_API_KEY / MAILCHIMP_SERVER_PREFIX / MAILCHIMP_AUDIENCE_ID");
}

mailchimp.setConfig({ apiKey: MC_API_KEY, server: MC_SERVER_PREFIX });

// Helper: idempotent upsert to Mailchimp Audience
async function upsertToMailchimp(entry) {
  const raw = (entry?.email || "").trim().toLowerCase();
  if (!raw) return; // no email, skip quietly

  const listId = MC_AUDIENCE_ID;
  const subscriberHash = crypto.createHash("md5").update(raw).digest("hex");

  // Optional: gate on consent
  // if (entry.agreeToNewsletter === false) return;

  // Optional merge fields mapping to your schema keys
  const merge_fields = {
    FNAME: entry.firstname || "",
    LNAME: entry.lastname || "",
    // You can map more (e.g., JOBTITLE, COMPANY, COUNTRY) via audience merge tags
  };

  // Upsert: if not present create with subscribed; if present, update fields
  await mailchimp.lists.setListMember(listId, subscriberHash, {
    email_address: raw,
    status_if_new: "subscribed",
    merge_fields,
  });
}

module.exports = {
  async afterCreate(event) {
    try {
      await upsertToMailchimp(event.result);
      strapi.log.info(`[mailchimp] upsert OK: ${event.result?.email}`);
    } catch (err) {
      strapi.log.error(`[mailchimp] upsert failed: ${event.result?.email} :: ${err.response?.text || err.message}`);
    }
  },
  // Optional: keep Mailchimp in sync on edits
  async afterUpdate(event) {
    try {
      await upsertToMailchimp(event.result);
      strapi.log.info(`[mailchimp] update OK: ${event.result?.email}`);
    } catch (err) {
      strapi.log.error(`[mailchimp] update failed: ${event.result?.email} :: ${err.response?.text || err.message}`);
    }
  },
};
