module.exports = ({ env }) => {
  // Let the admin panel show media served from S3/CDN (CDN_URL), on top of
  // Strapi's default Content-Security-Policy directives.
  const mediaHost = env('CDN_URL') ? new URL(env('CDN_URL')).origin : null;
  const withMedia = (sources) => (mediaHost ? [...sources, mediaHost] : sources);

  return [
    'strapi::logger',
    'strapi::errors',
    {
      name: 'strapi::security',
      config: {
        contentSecurityPolicy: {
          useDefaults: true,
          directives: {
            'connect-src': ["'self'", 'https:'],
            'img-src': withMedia(["'self'", 'data:', 'blob:', 'https://market-assets.strapi.io']),
            'media-src': withMedia(["'self'", 'data:', 'blob:']),
            upgradeInsecureRequests: null,
          },
        },
      },
    },
    'strapi::cors',
    'strapi::poweredBy',
    'strapi::query',
    'strapi::body',
    'strapi::session',
    'strapi::favicon',
    'strapi::public',
  ];
};
