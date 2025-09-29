"use strict";

const crypto = require("crypto");
const mailchimp = require("@mailchimp/mailchimp_marketing");

const MC_API_KEY = process.env.MAILCHIMP_API_KEY;
const MC_SERVER_PREFIX = process.env.MAILCHIMP_SERVER_PREFIX; // e.g., "us21"
const MC_AUDIENCE_ID = process.env.MAILCHIMP_AUDIENCE_ID;

// Log warning if any env variables are missing
if (!MC_API_KEY || !MC_SERVER_PREFIX || !MC_AUDIENCE_ID) {
  console.warn(
    "[mailchimp] ⚠ Missing env variables: MAILCHIMP_API_KEY, MAILCHIMP_SERVER_PREFIX, or MAILCHIMP_AUDIENCE_ID"
  );
}

// Configure Mailchimp
mailchimp.setConfig({ apiKey: MC_API_KEY, server: MC_SERVER_PREFIX });

// Helper: Upsert subscriber in Mailchimp and trigger automation email
async function upsertToMailchimp(entry) {
  const email = (entry?.email || "").trim().toLowerCase();
  if (!email) return;

  const hash = crypto.createHash("md5").update(email).digest("hex");

  // status_if_new: "subscribed" triggers automation (Trigger 0)
  await mailchimp.lists.setListMember(MC_AUDIENCE_ID, hash, {
    email_address: email,
    status_if_new: "subscribed",
  });

  // Success log in terminal
  console.log(`[Mailchimp] ✅ Successfully synced email: ${email}`);
}

module.exports = {
  // Validate email before creating
  beforeCreate(event) {
    const email = event.params.data.email;
    if (!email) {
      throw new Error("Email is required");
    }
    if (!email.includes("@")) {
      throw new Error("Invalid email address");
    }
  },

  // Validate email before updating
  beforeUpdate(event) {
    if (event.params.data.email && !event.params.data.email.includes("@")) {
      throw new Error("Invalid email address");
    }
  },

  // After creating, sync with Mailchimp
  async afterCreate(event) {
    try {
      await upsertToMailchimp(event.result);
      strapi.log.info(`[Mailchimp] subscribed: ${event.result?.email}`);
    } catch (err) {
      strapi.log.error(
        `[Mailchimp] ❌ subscribe failed: ${event.result?.email} :: ${
          err.response?.text || err.message
        }`
      );
    }
  },

  // After updating, sync with Mailchimp
  async afterUpdate(event) {
    try {
      await upsertToMailchimp(event.result);
      strapi.log.info(`[Mailchimp] updated: ${event.result?.email}`);
    } catch (err) {
      strapi.log.error(
        `[Mailchimp] ❌ update failed: ${event.result?.email} :: ${
          err.response?.text || err.message
        }`
      );
    }
  },
};
