"use strict";

const crypto = require("crypto");
const mailchimp = require("@mailchimp/mailchimp_marketing");

const MC_API_KEY = process.env.MAILCHIMP_API_KEY;
const MC_SERVER_PREFIX = process.env.MAILCHIMP_SERVER_PREFIX; // e.g. "us21"
const MC_AUDIENCE_ID = process.env.MAILCHIMP_AUDIENCE_ID;

// Warn early if missing env
if (!MC_API_KEY || !MC_SERVER_PREFIX || !MC_AUDIENCE_ID) {
  console.warn(
    "[mailchimp] Missing env: MAILCHIMP_API_KEY / MAILCHIMP_SERVER_PREFIX / MAILCHIMP_AUDIENCE_ID"
  );
}

mailchimp.setConfig({ apiKey: MC_API_KEY, server: MC_SERVER_PREFIX });

// ---- Helper: upsert subscriber by email (no-op if no email) ----
async function upsertToMailchimp(entry) {
  const raw = (entry?.email || "").trim().toLowerCase();
  if (!raw) return; // no email field on news? then nothing to do.

  const listId = MC_AUDIENCE_ID;
  const subscriberHash = crypto.createHash("md5").update(raw).digest("hex");

  await mailchimp.lists.setListMember(listId, subscriberHash, {
    email_address: raw,
    status_if_new: "subscribed",
    // Optional: map extra fields from your News content-type:
    // merge_fields: { FNAME: entry.authorFirstName, LNAME: entry.authorLastName, SOURCE: "StrapiNews" }
  });
}

module.exports = {
  // Use beforeUpdate to capture whether the entry was published before the update.
  async beforeUpdate(event) {
    const { where } = event.params || {};
    if (!where?.id) return;

    // Fetch current publish state BEFORE update applies
    const existing = await strapi.entityService.findOne("api::news.news", where.id, {
      fields: ["id", "publishedAt"],
    });

    // Store state for use in afterUpdate
    event.state = event.state || {};
    event.state.wasPublished = !!existing?.publishedAt;
  },

  async afterCreate(event) {
    try {
      const entry = event.result;

      // If Draft & Publish is enabled: only trigger when already published at creation
      const isPublishedNow = !!entry?.publishedAt;
      if (!isPublishedNow) {
        strapi.log.info("[mailchimp] skipped (news created as draft)");
        return;
      }

      await upsertToMailchimp(entry);
      strapi.log.info(`[mailchimp] subscribed (news created+published): ${entry?.email || "no-email"}`);
    } catch (err) {
      strapi.log.error(
        `[mailchimp] subscribe failed (afterCreate): ${(event.result && event.result.email) || "no-email"} :: ${
          err.response?.text || err.message
        }`
      );
    }
  },

  async afterUpdate(event) {
    try {
      const entry = event.result;

      const wasPublished = !!(event.state && event.state.wasPublished);
      const isPublishedNow = !!entry?.publishedAt;

      // Fire only on actual publish transition: draft -> published
      if (!wasPublished && isPublishedNow) {
        await upsertToMailchimp(entry);
        strapi.log.info(`[mailchimp] updated (news published): ${entry?.email || "no-email"}`);
      } else {
        // Optional: uncomment if you want to upsert on any edit (already-published too)
        // if (isPublishedNow) {
        //   await upsertToMailchimp(entry);
        //   strapi.log.info(`[mailchimp] updated (news edited while published): ${entry?.email || "no-email"}`);
        // } else {
        strapi.log.info("[mailchimp] skipped (no publish transition)");
        // }
      }
    } catch (err) {
      strapi.log.error(
        `[mailchimp] update failed (afterUpdate): ${(event.result && event.result.email) || "no-email"} :: ${
          err.response?.text || err.message
        }`
      );
    }
  },
};

