"use strict";

const crypto = require("crypto");
const mailchimp = require("@mailchimp/mailchimp_marketing");

// ── Env vars ───────────────────────────────────────────────────────────────────
const MC_API_KEY = process.env.MAILCHIMP_API_KEY;
const MC_SERVER_PREFIX = process.env.MAILCHIMP_SERVER_PREFIX; // e.g. "us21"
const MC_AUDIENCE_ID = process.env.MAILCHIMP_AUDIENCE_ID; // List ID
const MC_FROM_NAME = process.env.MAILCHIMP_FROM_NAME || "MiningDiscovery";
const MC_REPLY_TO =
  process.env.MAILCHIMP_REPLY_TO || "midisresourcespvtltd@gmail.com";

// normalize: avoid trailing slash problems
const rawSite = process.env.PUBLIC_SITE_URL || "https://www.miningdiscovery.com";
const PUBLIC_SITE_URL = rawSite.replace(/\/+$/, "");

// Send controls
// ⛔ Default FALSE: never auto-send. You'll trigger manually in Mailchimp.
const MC_ENABLE_SEND =
  String(process.env.MAILCHIMP_ENABLE_SEND ?? "false").toLowerCase() === "true";

// If a campaign was already sent, resend only if this is true (kept for safety if you ever turn sending on)
const MC_FORCE_RESEND =
  String(process.env.MAILCHIMP_FORCE_RESEND ?? "false").toLowerCase() === "true";

const MC_DEFAULT_TAGS = (process.env.MAILCHIMP_DEFAULT_TAGS || "mining,news")
  .split(",")
  .map((t) => t.trim())
  .filter(Boolean);

// Warn if missing critical env vars
if (!MC_API_KEY || !MC_SERVER_PREFIX || !MC_AUDIENCE_ID) {
  console.warn(
    "[Mailchimp] Missing env vars: MAILCHIMP_API_KEY / MAILCHIMP_SERVER_PREFIX / MAILCHIMP_AUDIENCE_ID"
  );
}

mailchimp.setConfig({
  apiKey: MC_API_KEY,
  server: MC_SERVER_PREFIX,
});

// ── Helpers ────────────────────────────────────────────────────────────────────
function isPublished(entry) {
  return Boolean(entry?.publishedAt);
}

function getDocumentId(entry) {
  // Prefer explicit documentId; fall back to nested or plain id as last resort
  return entry?.documentId || entry?.document?.id || entry?.id;
}

function buildIdempotencyKey(entry) {
  const documentId = getDocumentId(entry) || "";
  const ts = entry?.updatedAt || entry?.publishedAt || entry?.createdAt || "";
  const base = `${documentId}:${ts}`;
  return crypto.createHash("sha256").update(base).digest("hex").slice(0, 24);
}

/**
 * Draft decision (no auto-send):
 * - Create/update a campaign only when an entry is (newly) published.
 * - We removed the "trigger 0" path that sent on creation.
 */
function shouldCreateOrUpdateCampaign(event) {
  const { action, result, params } = event || {};
  if (!result) return false;

  // Detect an explicit publish action (publishedAt present in payload)
  const payloadIncludedPublishedAt = Object.prototype.hasOwnProperty.call(
    params?.data || {},
    "publishedAt"
  );

  // On create: only if it is created in a published state (explicit publish)
  if (action === "afterCreate" && isPublished(result) && payloadIncludedPublishedAt) {
    return true;
  }

  // On update: only if it (re)publishes or changes publishedAt
  if (action === "afterUpdate" && isPublished(result) && payloadIncludedPublishedAt) {
    return true;
  }

  return false;
}

function buildEmailHtml(entry) {
  const title = entry?.title || "New update";
  const excerpt = entry?.excerpt || entry?.description || "";
  const heroUrl =
    entry?.cover?.url ||
    entry?.image?.url ||
    entry?.hero?.url ||
    entry?.cover?.formats?.large?.url ||
    entry?.cover?.formats?.medium?.url ||
    null;

  const documentId = getDocumentId(entry);
  const url = `${PUBLIC_SITE_URL}/news-sections/${documentId}`;

  // Only escape for title, NOT for excerpt which may contain HTML
  const safe = (s) => String(s || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const cleanExcerpt = excerpt || "";

  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>${safe(title)}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          background: #f4f4f4;
        }
        .email-container { max-width: 600px; margin: 0 auto; background: #ffffff; }
        .view-browser { background: #f9f9f9; text-align: center; padding: 12px; font-size: 12px; }
        .view-browser a { color: #333; text-decoration: underline; }
        .header { background: #ffffff; padding: 30px 20px; text-align: center; border-bottom: 3px solid #ae8a4c; }
        .logo { max-width: 280px; height: auto; }
        .section-title { background: #ae8a4c; color: #ffffff; padding: 16px 20px; font-size: 18px; font-weight: 700; text-align: left; }
        .content { padding: 30px 20px; color: #333333; line-height: 1.6; font-size: 15px; background: #ffffff; }
        .content p { margin-bottom: 16px; text-align: justify; }
        .content p:last-child { margin-bottom: 0; }
        .cta-button { text-align: center; padding: 20px; background: #ffffff; }
        .cta { display: inline-block; padding: 12px 40px; background: #d4a574; color: #333333; text-decoration: none; border-radius: 4px; font-weight: 700; font-size: 15px; border: 2px solid #ae8a4c; }
        .hero-section { padding: 20px; background: #ffffff; }
        .hero-image { width: 100%; height: auto; display: block; border-radius: 4px; }
        .social-section { background: #ae8a4c; padding: 25px 20px; text-align: center; }
        .social-icons { display: inline-block; text-align: center; }
        .social-icon { display: inline-block; width: 40px; height: 40px; margin: 0 10px; background: #333333; border-radius: 50%; text-align: center; vertical-align: middle; }
        .social-icon img { width: 20px; height: 20px; margin-top: 10px; }
        .footer { background: #ae8a4c; padding: 20px; color: #333333; font-size: 11px; text-align: center; }
        @media (max-width: 640px) {
          .content { padding: 20px 15px; font-size: 14px; }
          .section-title { font-size: 16px; padding: 14px 15px; }
          .social-icon { margin: 0 8px; }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="view-browser">
          <a href="${url}" target="_blank" rel="noopener">View this email in your browser</a>
        </div>

        <div class="header">
          <img
            src="${PUBLIC_SITE_URL}/image/LOGO%20FOR%20Print.png"
            alt="Mining Discovery"
            class="logo"
          />
        </div>

        <div class="section-title">Get our Latest update</div>

        <div class="content">
          <h2 style="font-size:22px; margin-bottom:20px; color:#333; font-weight:700;">
            ${safe(title)}
          </h2>
          ${cleanExcerpt ? `<div>${cleanExcerpt}</div>` : ""}
        </div>

        <div class="cta-button">
          <!-- Optional CTA (kept empty by design) -->
        </div>

        ${heroUrl ? `
        <div class="hero-section">
          <img src="${heroUrl}" alt="Article image" class="hero-image" />
        </div>` : ""}

        <div class="footer">
          <p style="margin-bottom:10px">
            Copyright (C) *|CURRENT_YEAR|* *|LIST:COMPANY|* All rights reserved.
          </p>
          <p>You're receiving this because you subscribed to MiningDiscovery updates.</p>
        </div>
      </div>
    </body>
  </html>
  `;
}

async function createOrSendCampaign(entry) {
  if (!MC_API_KEY || !MC_SERVER_PREFIX || !MC_AUDIENCE_ID) {
    strapi.log.warn("[Mailchimp] Missing required Mailchimp env vars; skipping.");
    return;
  }

  const documentId = getDocumentId(entry);
  const subject = `New: ${entry?.title || "MiningDiscovery Update"}`;
  const title = `News #${documentId} – ${entry?.title || "Update"}`;
  const idempotencyKey = buildIdempotencyKey(entry);
  const html = buildEmailHtml(entry);

  let existing = null;
  try {
    const listResp = await mailchimp.campaigns.list({
      count: 50,
      sortField: "create_time",
      sortDir: "DESC",
      status: "save",
    });

    const campaigns = Array.isArray(listResp?.campaigns) ? listResp.campaigns : [];
    if (campaigns.length > 0) {
      existing = campaigns.find(
        (c) =>
          c?.recipients?.list_id === MC_AUDIENCE_ID &&
          (c?.settings?.title?.includes(`News #${documentId} `) ||
            c?.settings?.title?.includes(idempotencyKey))
      );
    }
  } catch (e) {
    strapi.log.error(`[Mailchimp] Error listing campaigns: ${e?.message || e}`);
  }

  let campaignId;
  if (!existing) {
    const createResp = await mailchimp.campaigns.create({
      type: "regular",
      recipients: { list_id: MC_AUDIENCE_ID },
      settings: {
        title: `${title} · ${idempotencyKey}`,
        subject_line: subject,
        from_name: MC_FROM_NAME,
        reply_to: MC_REPLY_TO,
        to_name: "*|FNAME|*",
        auto_footer: false,
      },
      tracking: { opens: true, html_clicks: true, text_clicks: false },
    });

    if (createResp?.id) {
      campaignId = createResp.id;
      strapi.log.info(
        `[Mailchimp] Created campaign ${campaignId} for news document ${documentId}`
      );
    } else {
      strapi.log.error(
        `[Mailchimp] Failed to create campaign: ${JSON.stringify(createResp)}`
      );
      return;
    }
  } else {
    campaignId = existing.id;
    try {
      await mailchimp.campaigns.setContent(campaignId, { html });
      strapi.log.info(
        `[Mailchimp] Updated content for campaign ${campaignId} for news document ${documentId}`
      );
    } catch (e) {
      strapi.log.error(
        `[Mailchimp] Failed to update campaign content: ${e?.message || e}`
      );
      return;
    }
    strapi.log.info(
      `[Mailchimp] Reusing campaign ${campaignId} for news document ${documentId}`
    );
  }

  // Ensure content is present for brand-new campaign
  if (!existing) {
    try {
      await mailchimp.campaigns.setContent(campaignId, { html });
    } catch (e) {
      strapi.log.error(
        `[Mailchimp] Failed to set content on new campaign: ${e?.message || e}`
      );
      return;
    }
  }

  // 🚫 Do not auto-send. Keep as draft unless explicitly enabled via env.
  if (MC_ENABLE_SEND) {
    let retrieved = null;
    try {
      const campaignsList = await mailchimp.campaigns.list({ count: 100 });
      const arr = Array.isArray(campaignsList?.campaigns) ? campaignsList.campaigns : [];
      retrieved = arr.find((c) => c.id === campaignId) || null;
    } catch (e) {
      strapi.log.warn(`[Mailchimp] Could not re-list to verify status: ${e?.message || e}`);
    }

    if (retrieved?.status === "sent" && !MC_FORCE_RESEND) {
      strapi.log.warn(
        `[Mailchimp] Campaign ${campaignId} already sent; skipping send.`
      );
      return;
    }

    try {
      await mailchimp.campaigns.send(campaignId);
      strapi.log.info(
        `[Mailchimp] ✅ Sent campaign ${campaignId} for news document ${documentId}`
      );
    } catch (e) {
      strapi.log.error(`[Mailchimp] Failed to send campaign: ${e?.message || e}`);
    }
  } else {
    strapi.log.info(
      `[Mailchimp] Drafted campaign ${campaignId} (MAILCHIMP_ENABLE_SEND=false)`
    );
  }
}

// ── Lifecycles ────────────────────────────────────────────────────────────────
module.exports = {
  async afterCreate(event) {
    try {
      if (shouldCreateOrUpdateCampaign(event)) {
        await createOrSendCampaign(event.result);
      } else {
        strapi.log.debug("[Mailchimp] News created but not a publish action; skipping campaign draft.");
      }
    } catch (err) {
      strapi.log.error(`[Mailchimp] afterCreate error: ${err?.message || err}`);
    }
  },

  async afterUpdate(event) {
    try {
      if (shouldCreateOrUpdateCampaign(event)) {
        await createOrSendCampaign(event.result);
      } else {
        strapi.log.debug("[Mailchimp] News updated without publish action; skipping campaign draft.");
      }
    } catch (err) {
      strapi.log.error(`[Mailchimp] afterUpdate error: ${err?.message || err}`);
    }
  },
};
