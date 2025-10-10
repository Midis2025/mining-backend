const mailchimp = require("@mailchimp/mailchimp_marketing");

mailchimp.setConfig({
  apiKey: process.env.MAILCHIMP_API_KEY,
  server: process.env.MAILCHIMP_SERVER_PREFIX,
});

async function test() {
  try {
    const response = await mailchimp.ping.get();
    console.log("✅ Mailchimp reachable:", response);
  } catch (err) {
    console.error("❌ Mailchimp unreachable:", err.message);
  }
}

test();
