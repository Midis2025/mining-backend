'use strict';

/**
 * post-newsletter controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::post-newsletter.post-newsletter');
