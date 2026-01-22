'use strict';

/**
 * article controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::article.article', {
  /**
   * Override create method to send to Mailchimp
   */
  async create(ctx) {
    // Call the default create method first
    const response = await super.create(ctx);

    // Send to Mailchimp if enabled and article is published
    if (
      process.env.MAILCHIMP_ENABLED === 'true' &&
      response.data &&
      response.data.attributes?.publishedAt
    ) {
      try {
        // Check if article belongs to "corporate-news" category
        const isCorporateNews = await this.isCorporateNewsCategory(
          response.data.id,
          ctx
        );

        if (!isCorporateNews) {
          strapi.log.info(
            `Article ${response.data.id} is not in corporate-news category, skipping Mailchimp`
          );
          return response;
        }

        const mailchimpService = require('../../../extensions/mailchimp/services');
        const article = response.data.attributes;

        // Prepare campaign data
        const campaignData = {
          subject: article.title,
          previewText:
            article.excerpt || article.description || article.title,
          htmlContent: mailchimpService.generateNewsEmailTemplate({
            ...article,
            id: response.data.id,
          }),
          fromName: 'Mining Discovery News',
          replyTo: process.env.MAILCHIMP_REPLY_EMAIL,
        };

        // Send campaign to MIDIS list
        const result = await mailchimpService.sendCampaign(campaignData);
        strapi.log.info(
          `Corporate news article sent to Mailchimp MIDIS list: ${result.campaignId}`
        );

        // Attach Mailchimp campaign ID to response
        response.data.attributes.mailchimpCampaignId = result.campaignId;
      } catch (error) {
        strapi.log.warn(
          `Could not send article to Mailchimp: ${error.message}`
        );
        // Don't fail the article creation if Mailchimp fails
      }
    }

    return response;
  },

  /**
   * Override update method to send updated article to Mailchimp
   */
  async update(ctx) {
    const response = await super.update(ctx);

    // Send to Mailchimp if enabled and article is published
    if (
      process.env.MAILCHIMP_ENABLE_ON_UPDATE === 'true' &&
      response.data &&
      response.data.attributes?.publishedAt
    ) {
      try {
        // Check if article belongs to "corporate-news" category
        const isCorporateNews = await this.isCorporateNewsCategory(
          response.data.id,
          ctx
        );

        if (!isCorporateNews) {
          strapi.log.info(
            `Updated article ${response.data.id} is not in corporate-news category, skipping Mailchimp`
          );
          return response;
        }

        const mailchimpService = require('../../../extensions/mailchimp/services');
        const article = response.data.attributes;

        const campaignData = {
          subject: `[UPDATE] ${article.title}`,
          previewText:
            article.excerpt || article.description || article.title,
          htmlContent: mailchimpService.generateNewsEmailTemplate({
            ...article,
            id: response.data.id,
          }),
          fromName: 'Mining Discovery News',
          replyTo: process.env.MAILCHIMP_REPLY_EMAIL,
        };

        const result = await mailchimpService.sendCampaign(campaignData);
        strapi.log.info(
          `Updated corporate news sent to Mailchimp: ${result.campaignId}`
        );
      } catch (error) {
        strapi.log.warn(
          `Could not send updated article to Mailchimp: ${error.message}`
        );
      }
    }

    return response;
  },

  /**
   * Check if article's associated news-section belongs to "corporate-news" category
   * 
   * Flow: Article → news_section_id (in request) → News Section has news_categories relationship
   *       → Check if any category.slug or category.category === "corporate-news"
   */
  async isCorporateNewsCategory(articleId, ctx) {
    try {
      // Get news_section_id from request body (used when posting article with section)
      const newsSectionId =
        ctx?.request?.body?.data?.news_section ||
        ctx?.request?.body?.data?.newsSection ||
        ctx?.request?.body?.data?.news_section_id;

      if (!newsSectionId) {
        strapi.log.warn(
          `No news_section provided for article ${articleId}, cannot verify corporate news status`
        );
        return false;
      }

      // Fetch the news section with its categories
      const newsSection = await strapi.entityService.findOne(
        'api::news-section.news-section',
        newsSectionId,
        {
          populate: {
            news_categories: true,
          },
        }
      );

      if (!newsSection || !newsSection.news_categories) {
        strapi.log.warn(
          `News section ${newsSectionId} not found or has no categories`
        );
        return false;
      }

      // Check if any of the categories is "corporate-news"
      const isCorporate = newsSection.news_categories.some((cat) => {
        // Check by slug or category name
        const categoryName = cat.slug || cat.category || '';
        return (
          categoryName.toLowerCase() === 'corporate-news' ||
          categoryName.toLowerCase() === 'corporate'
        );
      });

      if (isCorporate) {
        strapi.log.info(
          `Article ${articleId} is in corporate-news category, will send to Mailchimp`
        );
      }

      return isCorporate;
    } catch (error) {
      strapi.log.error(
        `Error checking if article is corporate news: ${error.message}`
      );
      return false;
    }
  },
});
