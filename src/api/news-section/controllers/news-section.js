'use strict';

/**
 * news-section controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { sendCampaignToMailchimp } = require('../../../utils/mailchimp');

module.exports = createCoreController('api::news-section.news-section', {
  /**
   * Manually send news to Mailchimp
   * POST /api/news-sections/:id/send-mail
   */
  async sendManual(ctx) {
    try {
      const { id } = ctx.params;

      console.log('[MAILCHIMP] Manual send request for news ID:', id);

      // Fetch news section
      const newsSection = await strapi.entityService.findOne(
        'api::news-section.news-section',
        id,
        {
          populate: ['image', 'news_categories'],
        }
      );

      if (!newsSection) {
        return ctx.notFound('News section not found');
      }

      // Check if published
      if (!newsSection.publishedAt) {
        return ctx.badRequest('News must be published to send');
      }

      // Check if corporate-news category
      const isCorporateNews = newsSection.news_categories?.some(
        (cat) => cat.slug === 'corporate-news' || cat.slug === 'corporate'
      );

      if (!isCorporateNews) {
        return ctx.badRequest('Only corporate-news category can be sent to Mailchimp');
      }

      console.log('[MAILCHIMP] ✓ Validation passed, preparing email...');

      // Prepare email data
      const emailData = {
        title: newsSection.title,
        short_description: newsSection.short_description,
        description: newsSection.description,
        image: newsSection.image?.url || null,
        slug: newsSection.slug,
      };

      // Send to Mailchimp
      const result = await sendCampaignToMailchimp(emailData);

      if (result.success) {
        // Update mailSent flag
        await strapi.entityService.update(
          'api::news-section.news-section',
          id,
          {
            data: {
              mailSent: true,
            },
          }
        );

        console.log('[MAILCHIMP] ✓ Campaign sent successfully');

        return ctx.send({
          success: true,
          message: 'Campaign created and sent to Mailchimp',
          campaignId: result.campaignId,
          newsTitle: newsSection.title,
        });
      }

      throw new Error(result.error || 'Failed to create campaign');
    } catch (error) {
      console.error('[MAILCHIMP] ✗ Manual send error:', error.message);
      strapi.log.error(`Manual email send error: ${error.message}`);

      return ctx.internalServerError({
        success: false,
        message: 'Failed to send campaign',
        error: error.message,
      });
    }
  },
});
