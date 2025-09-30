'use strict';

/**
 * investor service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::investor.investor');
