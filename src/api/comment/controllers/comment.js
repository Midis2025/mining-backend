'use strict';

/**
 * comment controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::comment.comment', ({ strapi }) => ({
  /**
   * Create a new comment for a news article
   * POST /api/comments
   */
  async create(ctx) {
    try {
      const { comment, name, email, news_section } = ctx.request.body.data;

      // Validate required fields
      if (!comment || !name || !email || !news_section) {
        return ctx.badRequest('Missing required fields: comment, name, email, and news_section are required');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return ctx.badRequest('Invalid email format');
      }

      // Verify that the news section exists
      const newsExists = await strapi.entityService.findOne(
        'api::news-section.news-section',
        news_section
      );

      if (!newsExists) {
        return ctx.notFound('News section not found');
      }

      // Create the comment
      const newComment = await strapi.entityService.create('api::comment.comment', {
        data: {
          comment,
          name,
          email,
          news_section,
          publishedAt: new Date(),
        },
        populate: ['news_section'],
      });

      return ctx.created({
        data: newComment,
        message: 'Comment submitted successfully',
      });
    } catch (error) {
      strapi.log.error('Error creating comment:', error);
      return ctx.internalServerError('An error occurred while creating the comment');
    }
  },

  /**
   * Get all comments for a specific news article
   * GET /api/comments/news/:newsId
   */
  async findByNews(ctx) {
    try {
      const { newsId } = ctx.params;

      if (!newsId) {
        return ctx.badRequest('News ID is required');
      }

      // Verify that the news section exists
      const newsExists = await strapi.entityService.findOne(
        'api::news-section.news-section',
        newsId
      );

      if (!newsExists) {
        return ctx.notFound('News section not found');
      }

      // Get all comments for this news section
      const comments = await strapi.entityService.findMany('api::comment.comment', {
        filters: {
          news_section: newsId,
        },
        sort: { createdAt: 'desc' },
      });

      return ctx.send({
        data: comments,
      });
    } catch (error) {
      strapi.log.error('Error fetching comments:', error);
      return ctx.internalServerError('An error occurred while fetching comments');
    }
  },
}));
