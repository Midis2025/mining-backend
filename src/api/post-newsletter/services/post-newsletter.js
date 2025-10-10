'use strict';

/**
 * post-newsletter service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::post-newsletter.post-newsletter');
