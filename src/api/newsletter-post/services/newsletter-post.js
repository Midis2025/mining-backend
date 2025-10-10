'use strict';

/**
 * newsletter-post service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::newsletter-post.newsletter-post');
