'use strict';

/**
 * Custom routes for news-section - Mailchimp sending
 */

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/news-sections/:id/send-mail',
      handler: 'api::news-section.news-section.sendManual',
      config: {
        policies: [],
      },
    },
  ],
};
