"use strict";

const crypto = require("crypto");
const mailchimp = require("@mailchimp/mailchimp_marketing");

// ── Env vars ───────────────────────────────────────────────────────────────────
const MC_API_KEY = process.env.MAILCHIMP_API_KEY;
const MC_SERVER_PREFIX = process.env.MAILCHIMP_SERVER_PREFIX; // e.g. "us21"
const MC_AUDIENCE_ID = process.env.MAILCHIMP_AUDIENCE_ID; // List ID
const MC_FROM_NAME = process.env.MAILCHIMP_FROM_NAME || "MiningDiscovery";
const MC_REPLY_TO = process.env.MAILCHIMP_REPLY_TO || "midisresourcespvtltd@gmail.com";
const PUBLIC_SITE_URL = process.env.PUBLIC_SITE_URL || "https://staging.miningdiscovery.com/";

const MC_ENABLE_SEND = String(process.env.MAILCHIMP_ENABLE_SEND).toLowerCase() === "true";
const MC_FORCE_RESEND = String(process.env.MAILCHIMP_FORCE_RESEND).toLowerCase() === "true";

const MC_DEFAULT_TAGS = (process.env.MAILCHIMP_DEFAULT_TAGS || "mining,news")
  .split(",")
  .map((t) => t.trim())
  .filter(Boolean);

// Warn if missing env vars
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

function becamePublished(event) {
  const { result, params } = event || {};
  const nowPublished = isPublished(result);
  const payloadIncludedPublishedAt = Object.prototype.hasOwnProperty.call(
    params?.data || {},
    "publishedAt"
  );

  if (!nowPublished) return false;
  if (event.action === "afterCreate") return true;
  if (event.action === "afterUpdate" && payloadIncludedPublishedAt) return true;

  return false;
}

function getDocumentId(entry) {
  // Prefer explicit documentId; fall back to nested or plain id as last resort
  return entry?.documentId || entry?.document?.id || entry?.id;
}

function buildIdempotencyKey(entry) {
  const documentId = getDocumentId(entry) || "";
  const ts = entry?.updatedAt || entry?.publishedAt || "";
  const base = `${documentId}:${ts}`;
  return crypto.createHash("sha256").update(base).digest("hex").slice(0, 24);
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

  const safe = (s) => String(s || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return `
  <!doctype html>
  <html>
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>${safe(title)}</title>
    <style>
      body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 0; background: #f6f7f9; }
      .wrap { max-width: 640px; margin: 0 auto; background: #ffffff; }
      .header { padding: 20px 24px; font-size: 18px; font-weight: 700; border-bottom: 1px solid #eee; }
      .hero img { display: block; width: 100%; height: auto; }
      .content { padding: 24px; color: #222; line-height: 1.56; font-size: 16px; }
      .title { font-size: 24px; margin: 0 0 12px 0; }
      .cta { display: inline-block; margin-top: 16px; padding: 12px 18px; background: #111827; color: #fff; text-decoration: none; border-radius: 8px; }
      .footer { padding: 16px 24px; color: #666; font-size: 12px; text-align: center; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="header">MiningDiscovery</div>
      ${heroUrl ? `<div class="hero"><img src="${heroUrl}" alt=""></div>` : ""}
      <div class="content">
        <h1 class="title">${safe(title)}</h1>
        ${excerpt ? `<p>${safe(excerpt)}</p>` : ""}
        <a href="${url}" class="cta" target="_blank" rel="noopener">Read the full article</a>
      </div>
      <div class="footer">
        You’re receiving this because you subscribed to MiningDiscovery updates.
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

    if (
      listResp &&
      typeof listResp === "object" &&
      "campaigns" in listResp &&
      Array.isArray(listResp.campaigns) &&
      listResp.campaigns.length
    ) {
      existing = listResp.campaigns.find(
        (c) =>
          c?.recipients?.list_id === MC_AUDIENCE_ID &&
          (c?.settings?.title?.includes(`News #${documentId} `) ||
            c?.settings?.title?.includes(idempotencyKey))
      );
    }
  } catch (e) {
    strapi.log.debug(`[Mailchimp] list campaigns error: ${e?.message || e}`);
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
        to_name: "|FNAME|",
        auto_footer: false,
      },
      tracking: { opens: true, html_clicks: true, text_clicks: false },
    });

    if (createResp && typeof createResp === "object" && "id" in createResp && createResp.id) {
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

  // Set content again in case of new campaign
  if (!existing) {
    await mailchimp.campaigns.setContent(campaignId, { html });
  }

  if (MC_ENABLE_SEND) {
    const campaignsList = await mailchimp.campaigns.list({ count: 100 });
    const retrieved =
      campaignsList &&
      typeof campaignsList === "object" &&
      "campaigns" in campaignsList &&
      Array.isArray(campaignsList.campaigns)
        ? campaignsList.campaigns.find((c) => c.id === campaignId)
        : null;

    if (retrieved?.status === "sent" && !MC_FORCE_RESEND) {
      strapi.log.warn(
        `[Mailchimp] Campaign ${campaignId} already sent; skipping send.`
      );
      return;
    }

    await mailchimp.campaigns.send(campaignId);
    strapi.log.info(
      `[Mailchimp] ✅ Sent campaign ${campaignId} for news document ${documentId}`
    );
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
      if (becamePublished(event)) {
        await createOrSendCampaign(event.result);
      } else {
        strapi.log.debug("[Mailchimp] News created but not published; skipping.");
      }
    } catch (err) {
      strapi.log.error(`[Mailchimp] afterCreate error: ${err?.message || err}`);
    }
  },

  async afterUpdate(event) {
    try {
      if (becamePublished(event)) {
        await createOrSendCampaign(event.result);
      } else {
        strapi.log.debug("[Mailchimp] News updated without publish action; skipping.");
      }
    } catch (err) {
      strapi.log.error(`[Mailchimp] afterUpdate error: ${err?.message || err}`);
    }
  },
};