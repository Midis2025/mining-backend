'use strict';

const { sendCampaignToMailchimp } = require('../../../../utils/mailchimp');

/**
 * Lifecycle hooks for news-section
 * Automatically send to Mailchimp when corporate news is published
 */
module.exports = {
  async afterCreate(event) {
    const { result } = event;
    await handleNewsPublication(result);
  },

  async afterUpdate(event) {
    const { result } = event;
    await handleNewsPublication(result);
  },
};

/**
 * Handle news publication - send to Mailchimp if conditions met
 */
async function handleNewsPublication(newsSection) {
  try {
    // Check if Mailchimp is enabled
    if (process.env.MAILCHIMP_ENABLED !== 'true') {
      console.log('[MAILCHIMP] ⚠️ Mailchimp disabled in .env');
      return;
    }

    console.log('[MAILCHIMP] Processing news ID:', newsSection.id);
    console.log('[MAILCHIMP] publishedAt:', newsSection.publishedAt);
    console.log('[MAILCHIMP] mailSent:', newsSection.mailSent);

    // Check if news is published
    if (!newsSection.publishedAt) {
      console.log('[MAILCHIMP] ⚠️ News not published yet, skipping');
      return;
    }

    // Check if already sent
    if (newsSection.mailSent) {
      console.log('[MAILCHIMP] ℹ️ Already sent to Mailchimp, skipping duplicate');
      return;
    }

    // Check if category is corporate-news
    const isCorporateNews = await isCorporateNewsCategory(newsSection.id);
    console.log('[MAILCHIMP] Is corporate-news?', isCorporateNews);
    if (!isCorporateNews) {
      console.log('[MAILCHIMP] ⚠️ Not corporate-news category, skipping');
      return;
    }

    console.log('[MAILCHIMP] ✅ All conditions met, proceeding to send...');

    // Fetch full news data with relations
    const fullNews = await strapi.entityService.findOne(
      'api::news-section.news-section',
      newsSection.id,
      {
        populate: ['image', 'news_categories'],
      }
    );

    console.log('[MAILCHIMP] Fetched full news data');
    console.log('[MAILCHIMP] Title:', fullNews.title);
    console.log('[MAILCHIMP] Image URL:', fullNews.image?.url || 'No image');
    console.log('[MAILCHIMP] Categories:', fullNews.news_categories?.length || 0);

    // Prepare data for email
    const emailData = {
      title: fullNews.title,
      short_description: fullNews.short_description,
      description: fullNews.description,
      image: fullNews.image?.url || null,
      slug: fullNews.slug,
    };

    console.log('[MAILCHIMP] 📧 Sending campaign to Mailchimp...');
    // Send to Mailchimp
    const result = await sendCampaignToMailchimp(emailData);

    console.log('[MAILCHIMP] Campaign result:', result);

    if (result.success) {
      // Update mailSent flag
      console.log('[MAILCHIMP] ✅ Campaign created successfully, updating flag...');
      await strapi.entityService.update(
        'api::news-section.news-section',
        newsSection.id,
        {
          data: {
            mailSent: true,
          },
        }
      );

      console.log('[MAILCHIMP] ✅✅ SUCCESS! Campaign ID:', result.campaignId);
      strapi.log.info(
        `Corporate news "${fullNews.title}" sent to Mailchimp (ID: ${result.campaignId})`
      );
    } else {
      console.log('[MAILCHIMP] ❌ Campaign creation failed:', result.error);
    }
  } catch (error) {
    console.error('[MAILCHIMP] ❌ ERROR in lifecycle hook:', error.message);
    console.error('[MAILCHIMP] Stack trace:', error.stack);
    strapi.log.error(`Mailchimp lifecycle error: ${error.message}`);
  }
}

/**
 * Check if news section belongs to corporate-news category
 */
async function isCorporateNewsCategory(newsSectionId) {
  try {
    const newsSection = await strapi.entityService.findOne(
      'api::news-section.news-section',
      newsSectionId,
      {
        populate: {
          news_categories: true,
        },
      }
    );

    console.log('[MAILCHIMP] Category check - fetched news section');
    console.log('[MAILCHIMP] Categories array:', JSON.stringify(newsSection?.news_categories || []));

    if (!newsSection?.news_categories || newsSection.news_categories.length === 0) {
      console.log('[MAILCHIMP] ⚠️ No categories found');
      return false;
    }

    const isCorporate = newsSection.news_categories.some((cat) => {
      console.log('[MAILCHIMP] Checking category:', { name: cat.name, slug: cat.slug });
      return cat.slug === 'corporate-news' || cat.slug === 'corporate';
    });

    console.log('[MAILCHIMP] Category check result: ' + (isCorporate ? 'YES' : 'NO'));
    return isCorporate;
  } catch (error) {
    console.error('[MAILCHIMP] ❌ Error checking category:', error.message);
    return false;
  }
}
