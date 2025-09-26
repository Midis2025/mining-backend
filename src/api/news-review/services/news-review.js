'use strict';

/**
 * news-review service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::news-review.news-review');
