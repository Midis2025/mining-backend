'use strict';

/**
 * comment router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

const defaultRouter = createCoreRouter('api::comment.comment');

const customRouter = (innerRouter, extraRoutes = []) => {
  let routes;
  return {
    get prefix() {
      return innerRouter.prefix;
    },
    get routes() {
      if (!routes) routes = innerRouter.routes.concat(extraRoutes);
      return routes;
    },
  };
};

const customRoutes = [
  {
    method: 'GET',
    path: '/comments/news/:newsId',
    handler: 'comment.findByNews',
    config: {
      auth: false, // Public route - no authentication required
      policies: [],
      middlewares: [],
    },
  },
];

module.exports = customRouter(defaultRouter, customRoutes);
