const mailchimpService = require('./services/mailchimp');

module.exports = {
  register(/*{ strapi }*/) { },

  bootstrap({ strapi }) {
    // Initialize Mailchimp
    mailchimpService.configure();

    // STRAPI 5 MIDDLEWARE: Catch every single document action
    strapi.documents.use(async (context, next) => {
      const { action, uid, documentId } = context;
      
      // Execute the action first
      const result = await next();

      // After the action is done, check if it was a publish or update
      if (action === 'publish' || action === 'update') {
        const finalDocId = documentId || result?.documentId || context.params?.documentId;
        console.log(`[DOC MIDDLEWARE] 🎯 Action: ${action} | UID: ${uid} | DocID: ${finalDocId}`);
        
        if (uid === 'api::news-section.news-section') {
          await handleNewsMail(result, finalDocId, action === 'publish');
        } else if (uid === 'api::magazine.magazine') {
          await handleMagazineMail(result, finalDocId, action === 'publish');
        }
      }

      return result;
    });

    // 1. Subscriber Sync
    strapi.db.lifecycles.subscribe({
      models: ['api::subscriber.subscriber'],
      async afterCreate(event) {
        await mailchimpService.syncSubscriber(event.result);
      },
      async afterUpdate(event) {
        await mailchimpService.syncSubscriber(event.result);
      }
    });

    // 2. Magazine Publication Lifecycle
    strapi.db.lifecycles.subscribe({
      models: ['api::magazine.magazine'],
      async afterCreate(event) {
        await handleMagazineMail(event.result, event.result.documentId);
      },
      async afterUpdate(event) {
        await handleMagazineMail(event.result, event.result.documentId);
      },
    });

    async function handleMagazineMail(result, docId, isPublishAction = false) {
      const documentId = docId || result?.documentId || result?.document_id;
      if (!documentId) return;

      const doc = await strapi.documents('api::magazine.magazine').findOne({
        documentId: documentId,
        populate: ['pdf', 'coverImage'],
      });

      const currentStatus = isPublishAction ? 'published' : (doc.status || (doc.publishedAt ? 'published' : 'draft'));
      console.log(`[MAILCHIMP] Magazine Hook: ID=${documentId}, Status=${currentStatus}, mailSent=${doc.mailSent}`);

      if (currentStatus === 'published' && !doc.mailSent) {
        console.log(`[MAILCHIMP] 📢 Attempting Magazine Campaign: ${doc.Title}`);
        const success = await mailchimpService.sendCampaign('magazine', doc);
        
        if (success) {
          await strapi.documents('api::magazine.magazine').update({
            documentId: documentId,
            data: { mailSent: true },
            status: 'published',
          });
        }
      }
    }

    // 3. News Section Publication Lifecycle
    strapi.db.lifecycles.subscribe({
      models: ['api::news-section.news-section'],
      async afterCreate(event) {
        await handleNewsMail(event.result, event.result.documentId);
      },
      async afterUpdate(event) {
        await handleNewsMail(event.result, event.result.documentId);
      }
    });

    async function handleNewsMail(result, docId, isPublishAction = false) {
      const documentId = docId || result?.documentId || result?.document_id;
      if (!documentId) return;

      const doc = await strapi.documents('api::news-section.news-section').findOne({
        documentId: documentId,
        populate: ['news_categories', 'image'],
      });

      const currentStatus = isPublishAction ? 'published' : (doc.status || (doc.publishedAt ? 'published' : 'draft'));
      console.log(`[MAILCHIMP] News Hook: ID=${documentId}, Status=${currentStatus}, mailSent=${doc.mailSent}, sendToMailchimp=${doc.sendToMailchimp}`);

      if (currentStatus === 'published' && !doc.mailSent && doc.sendToMailchimp) {
        const isCorporateNews = doc.news_categories?.some(
          (cat) => cat.slug === 'corporate-news'
        );

        if (isCorporateNews) {
          console.log(`[MAILCHIMP] ✅ Corporate News matched! Creating draft...`);
          const success = await mailchimpService.sendCampaign('corporate', doc);

          if (success) {
            await strapi.documents('api::news-section.news-section').update({
              documentId: documentId,
              data: { mailSent: true },
              status: 'published',
            });
          }
        }
      }
    }
  },
};
