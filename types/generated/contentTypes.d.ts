import type { Attribute, Schema } from '@strapi/strapi';

export interface AdminApiToken extends Schema.CollectionType {
  collectionName: 'strapi_api_tokens';
  info: {
    description: '';
    displayName: 'Api Token';
    name: 'Api Token';
    pluralName: 'api-tokens';
    singularName: 'api-token';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    accessKey: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'admin::api-token',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    description: Attribute.String &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Attribute.DefaultTo<''>;
    expiresAt: Attribute.DateTime;
    lastUsedAt: Attribute.DateTime;
    lifespan: Attribute.BigInteger;
    name: Attribute.String &
      Attribute.Required &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Attribute.Relation<
      'admin::api-token',
      'oneToMany',
      'admin::api-token-permission'
    >;
    type: Attribute.Enumeration<['read-only', 'full-access', 'custom']> &
      Attribute.Required &
      Attribute.DefaultTo<'read-only'>;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'admin::api-token',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface AdminApiTokenPermission extends Schema.CollectionType {
  collectionName: 'strapi_api_token_permissions';
  info: {
    description: '';
    displayName: 'API Token Permission';
    name: 'API Token Permission';
    pluralName: 'api-token-permissions';
    singularName: 'api-token-permission';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'admin::api-token-permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    token: Attribute.Relation<
      'admin::api-token-permission',
      'manyToOne',
      'admin::api-token'
    >;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'admin::api-token-permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface AdminPermission extends Schema.CollectionType {
  collectionName: 'admin_permissions';
  info: {
    description: '';
    displayName: 'Permission';
    name: 'Permission';
    pluralName: 'permissions';
    singularName: 'permission';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    actionParameters: Attribute.JSON & Attribute.DefaultTo<{}>;
    conditions: Attribute.JSON & Attribute.DefaultTo<[]>;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'admin::permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    properties: Attribute.JSON & Attribute.DefaultTo<{}>;
    role: Attribute.Relation<'admin::permission', 'manyToOne', 'admin::role'>;
    subject: Attribute.String &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'admin::permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface AdminRole extends Schema.CollectionType {
  collectionName: 'admin_roles';
  info: {
    description: '';
    displayName: 'Role';
    name: 'Role';
    pluralName: 'roles';
    singularName: 'role';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    code: Attribute.String &
      Attribute.Required &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<'admin::role', 'oneToOne', 'admin::user'> &
      Attribute.Private;
    description: Attribute.String;
    name: Attribute.String &
      Attribute.Required &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Attribute.Relation<
      'admin::role',
      'oneToMany',
      'admin::permission'
    >;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<'admin::role', 'oneToOne', 'admin::user'> &
      Attribute.Private;
    users: Attribute.Relation<'admin::role', 'manyToMany', 'admin::user'>;
  };
}

export interface AdminTransferToken extends Schema.CollectionType {
  collectionName: 'strapi_transfer_tokens';
  info: {
    description: '';
    displayName: 'Transfer Token';
    name: 'Transfer Token';
    pluralName: 'transfer-tokens';
    singularName: 'transfer-token';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    accessKey: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'admin::transfer-token',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    description: Attribute.String &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Attribute.DefaultTo<''>;
    expiresAt: Attribute.DateTime;
    lastUsedAt: Attribute.DateTime;
    lifespan: Attribute.BigInteger;
    name: Attribute.String &
      Attribute.Required &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Attribute.Relation<
      'admin::transfer-token',
      'oneToMany',
      'admin::transfer-token-permission'
    >;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'admin::transfer-token',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface AdminTransferTokenPermission extends Schema.CollectionType {
  collectionName: 'strapi_transfer_token_permissions';
  info: {
    description: '';
    displayName: 'Transfer Token Permission';
    name: 'Transfer Token Permission';
    pluralName: 'transfer-token-permissions';
    singularName: 'transfer-token-permission';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'admin::transfer-token-permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    token: Attribute.Relation<
      'admin::transfer-token-permission',
      'manyToOne',
      'admin::transfer-token'
    >;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'admin::transfer-token-permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface AdminUser extends Schema.CollectionType {
  collectionName: 'admin_users';
  info: {
    description: '';
    displayName: 'User';
    name: 'User';
    pluralName: 'users';
    singularName: 'user';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    blocked: Attribute.Boolean & Attribute.Private & Attribute.DefaultTo<false>;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<'admin::user', 'oneToOne', 'admin::user'> &
      Attribute.Private;
    email: Attribute.Email &
      Attribute.Required &
      Attribute.Private &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    firstname: Attribute.String &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    isActive: Attribute.Boolean &
      Attribute.Private &
      Attribute.DefaultTo<false>;
    lastname: Attribute.String &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    password: Attribute.Password &
      Attribute.Private &
      Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    preferedLanguage: Attribute.String;
    registrationToken: Attribute.String & Attribute.Private;
    resetPasswordToken: Attribute.String & Attribute.Private;
    roles: Attribute.Relation<'admin::user', 'manyToMany', 'admin::role'> &
      Attribute.Private;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<'admin::user', 'oneToOne', 'admin::user'> &
      Attribute.Private;
    username: Attribute.String;
  };
}

export interface ApiAboutUsAboutUs extends Schema.CollectionType {
  collectionName: 'about_uses';
  info: {
    displayName: 'about-us';
    pluralName: 'about-uses';
    singularName: 'about-us';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::about-us.about-us',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    description: Attribute.Blocks;
    publishedAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::about-us.about-us',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiAboutAbout extends Schema.SingleType {
  collectionName: 'abouts';
  info: {
    description: 'Write about yourself and the content you create';
    displayName: 'About';
    pluralName: 'abouts';
    singularName: 'about';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    blocks: Attribute.DynamicZone<
      ['shared.media', 'shared.quote', 'shared.rich-text', 'shared.slider']
    >;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::about.about',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    title: Attribute.String;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::about.about',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiAdvertisementAdvertisement extends Schema.CollectionType {
  collectionName: 'advertisements';
  info: {
    displayName: 'advertisement';
    pluralName: 'advertisements';
    singularName: 'advertisement';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    ad_url: Attribute.String;
    ads_image: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    alt_text: Attribute.String;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::advertisement.advertisement',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    publishedAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::advertisement.advertisement',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiArticleArticle extends Schema.CollectionType {
  collectionName: 'articles';
  info: {
    description: 'Create your blog content';
    displayName: 'Article';
    pluralName: 'articles';
    singularName: 'article';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    author: Attribute.Relation<
      'api::article.article',
      'manyToOne',
      'api::author.author'
    >;
    blocks: Attribute.DynamicZone<
      ['shared.media', 'shared.quote', 'shared.rich-text', 'shared.slider']
    >;
    category: Attribute.Relation<
      'api::article.article',
      'manyToOne',
      'api::category.category'
    >;
    cover: Attribute.Media<'images' | 'files' | 'videos'>;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::article.article',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    description: Attribute.Text &
      Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    publishedAt: Attribute.DateTime;
    slug: Attribute.UID<'api::article.article', 'title'>;
    title: Attribute.String;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::article.article',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiAuthorAuthor extends Schema.CollectionType {
  collectionName: 'authors';
  info: {
    description: 'Create authors for your content';
    displayName: 'Author';
    pluralName: 'authors';
    singularName: 'author';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    articles: Attribute.Relation<
      'api::author.author',
      'oneToMany',
      'api::article.article'
    >;
    avatar: Attribute.Media<'images' | 'files' | 'videos'>;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::author.author',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    email: Attribute.String;
    name: Attribute.String;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::author.author',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiCategoryCategory extends Schema.CollectionType {
  collectionName: 'categories';
  info: {
    description: 'Organize your content into categories';
    displayName: 'Category';
    pluralName: 'categories';
    singularName: 'category';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    articles: Attribute.Relation<
      'api::category.category',
      'oneToMany',
      'api::article.article'
    >;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::category.category',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    description: Attribute.Text;
    name: Attribute.String;
    slug: Attribute.UID;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::category.category',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiCeoProfileCeoProfile extends Schema.CollectionType {
  collectionName: 'ceo_profiles';
  info: {
    displayName: 'ceo-profile';
    pluralName: 'ceo-profiles';
    singularName: 'ceo-profile';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    ceo_image: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    ceo_pdf: Attribute.Media<'images' | 'files' | 'videos' | 'audios', true>;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::ceo-profile.ceo-profile',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    designation: Attribute.String;
    name: Attribute.String;
    publishedAt: Attribute.DateTime;
    shortDescription: Attribute.RichText;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::ceo-profile.ceo-profile',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiCompanyProfileCompanyProfile extends Schema.CollectionType {
  collectionName: 'company_profiles';
  info: {
    displayName: 'Company-profile';
    pluralName: 'company-profiles';
    singularName: 'company-profile';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    companyPdf: Attribute.Media<'images' | 'files' | 'videos' | 'audios', true>;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::company-profile.company-profile',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    logoImage: Attribute.Media<'images' | 'files' | 'videos' | 'audios', true>;
    publishedAt: Attribute.DateTime;
    shortDescription: Attribute.RichText;
    title: Attribute.String;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::company-profile.company-profile',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiContactUsContactUs extends Schema.CollectionType {
  collectionName: 'contact_uses';
  info: {
    displayName: 'Contact Us';
    pluralName: 'contact-uses';
    singularName: 'contact-us';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::contact-us.contact-us',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    email: Attribute.Email;
    message: Attribute.Text;
    name: Attribute.String;
    publishedAt: Attribute.DateTime;
    subject: Attribute.String;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::contact-us.contact-us',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiGlobalGlobal extends Schema.SingleType {
  collectionName: 'globals';
  info: {
    description: 'Define global settings';
    displayName: 'Global';
    pluralName: 'globals';
    singularName: 'global';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::global.global',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    defaultSeo: Attribute.Component<'shared.seo'>;
    favicon: Attribute.Media<'images' | 'files' | 'videos'>;
    siteDescription: Attribute.Text & Attribute.Required;
    siteName: Attribute.String & Attribute.Required;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::global.global',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiHomeAdvertismentHomeAdvertisment
  extends Schema.CollectionType {
  collectionName: 'home_advertisments';
  info: {
    displayName: 'HomeAdvertisment';
    pluralName: 'home-advertisments';
    singularName: 'home-advertisment';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    ad_url: Attribute.String;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::home-advertisment.home-advertisment',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    home_image: Attribute.Media<'images' | 'files' | 'videos' | 'audios', true>;
    publishedAt: Attribute.DateTime;
    title: Attribute.String;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::home-advertisment.home-advertisment',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    url_text: Attribute.String;
  };
}

export interface ApiMagazineMagazine extends Schema.CollectionType {
  collectionName: 'magazines';
  info: {
    displayName: 'magazine';
    pluralName: 'magazines';
    singularName: 'magazine';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    buttonLink: Attribute.String;
    buttonText: Attribute.String;
    coverImage: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::magazine.magazine',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    Description: Attribute.RichText;
    pdf: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    publishDate: Attribute.Date;
    publishedAt: Attribute.DateTime;
    Slug: Attribute.UID<'api::magazine.magazine', 'Title'>;
    Title: Attribute.String;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::magazine.magazine',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiMultimediaAndYoutubeMultimediaAndYoutube
  extends Schema.CollectionType {
  collectionName: 'multimedia_and_youtubes';
  info: {
    displayName: 'Multimedia and youtube';
    pluralName: 'multimedia-and-youtubes';
    singularName: 'multimedia-and-youtube';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::multimedia-and-youtube.multimedia-and-youtube',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    iframe: Attribute.Text;
    multimedia_category: Attribute.Relation<
      'api::multimedia-and-youtube.multimedia-and-youtube',
      'manyToOne',
      'api::multimedia-category.multimedia-category'
    >;
    publishedAt: Attribute.DateTime;
    title: Attribute.Text;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::multimedia-and-youtube.multimedia-and-youtube',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiMultimediaCategoryMultimediaCategory
  extends Schema.CollectionType {
  collectionName: 'multimedia_categories';
  info: {
    displayName: 'multimediaCategory';
    pluralName: 'multimedia-categories';
    singularName: 'multimedia-category';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::multimedia-category.multimedia-category',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    multimedia_and_youtubes: Attribute.Relation<
      'api::multimedia-category.multimedia-category',
      'oneToMany',
      'api::multimedia-and-youtube.multimedia-and-youtube'
    >;
    publishedAt: Attribute.DateTime;
    title: Attribute.String;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::multimedia-category.multimedia-category',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiNewsCategoryNewsCategory extends Schema.CollectionType {
  collectionName: 'news_categories';
  info: {
    displayName: 'news-category';
    pluralName: 'news-categories';
    singularName: 'news-category';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    category: Attribute.String;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::news-category.news-category',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    news_sections: Attribute.Relation<
      'api::news-category.news-category',
      'manyToMany',
      'api::news-section.news-section'
    >;
    publishedAt: Attribute.DateTime;
    slug: Attribute.UID<'api::news-category.news-category', 'category'>;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::news-category.news-category',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiNewsSectionNewsSection extends Schema.CollectionType {
  collectionName: 'news_sections';
  info: {
    displayName: 'news-section';
    pluralName: 'news-sections';
    singularName: 'news-section';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    author: Attribute.String;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::news-section.news-section',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    description: Attribute.RichText;
    image: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    news_categories: Attribute.Relation<
      'api::news-section.news-section',
      'manyToMany',
      'api::news-category.news-category'
    >;
    pdf: Attribute.Media<'images' | 'files' | 'videos' | 'audios', true>;
    publish_on: Attribute.Date;
    publishedAt: Attribute.DateTime;
    short_description: Attribute.Text;
    sponsoredPost: Attribute.Boolean;
    title: Attribute.String;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::news-section.news-section',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiNewsletterNewsletter extends Schema.CollectionType {
  collectionName: 'newsletters';
  info: {
    displayName: 'Newsletter';
    pluralName: 'newsletters';
    singularName: 'newsletter';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    agreeToNewsletter: Attribute.Boolean;
    companyName: Attribute.String;
    country: Attribute.String;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::newsletter.newsletter',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    email: Attribute.Email;
    firstname: Attribute.String;
    jobTitle: Attribute.String;
    lastname: Attribute.String;
    publishedAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::newsletter.newsletter',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiPopUpVideoPopUpVideo extends Schema.CollectionType {
  collectionName: 'pop_up_videos';
  info: {
    displayName: 'Pop up video';
    pluralName: 'pop-up-videos';
    singularName: 'pop-up-video';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::pop-up-video.pop-up-video',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    publishedAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::pop-up-video.pop-up-video',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    youtube_link: Attribute.Text;
  };
}

export interface ApiProjectProject extends Schema.CollectionType {
  collectionName: 'projects';
  info: {
    displayName: 'project';
    pluralName: 'projects';
    singularName: 'project';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    author: Attribute.String;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::project.project',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    longDescription: Attribute.RichText;
    project_image: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    project_title: Attribute.String;
    publishedAt: Attribute.DateTime;
    shortDescription: Attribute.RichText;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::project.project',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiReportReport extends Schema.CollectionType {
  collectionName: 'reports';
  info: {
    displayName: 'report';
    pluralName: 'reports';
    singularName: 'report';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    author: Attribute.String;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::report.report',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    longDescription: Attribute.RichText;
    publishedAt: Attribute.DateTime;
    reports_image: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    shortDescription: Attribute.RichText;
    title: Attribute.String;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::report.report',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiServicesCategoryServicesCategory
  extends Schema.CollectionType {
  collectionName: 'services_categories';
  info: {
    displayName: 'services-category';
    pluralName: 'services-categories';
    singularName: 'services-category';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    category: Attribute.String;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::services-category.services-category',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    publishedAt: Attribute.DateTime;
    services_sections: Attribute.Relation<
      'api::services-category.services-category',
      'oneToMany',
      'api::services-section.services-section'
    >;
    slug: Attribute.UID<'api::services-category.services-category', 'category'>;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::services-category.services-category',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiServicesSectionServicesSection
  extends Schema.CollectionType {
  collectionName: 'services_sections';
  info: {
    displayName: 'services-section';
    pluralName: 'services-sections';
    singularName: 'services-section';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::services-section.services-section',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    description: Attribute.Blocks;
    publishedAt: Attribute.DateTime;
    services_category: Attribute.Relation<
      'api::services-section.services-section',
      'manyToOne',
      'api::services-category.services-category'
    >;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::services-section.services-section',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginContentReleasesRelease extends Schema.CollectionType {
  collectionName: 'strapi_releases';
  info: {
    displayName: 'Release';
    pluralName: 'releases';
    singularName: 'release';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    actions: Attribute.Relation<
      'plugin::content-releases.release',
      'oneToMany',
      'plugin::content-releases.release-action'
    >;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::content-releases.release',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    name: Attribute.String & Attribute.Required;
    releasedAt: Attribute.DateTime;
    scheduledAt: Attribute.DateTime;
    status: Attribute.Enumeration<
      ['ready', 'blocked', 'failed', 'done', 'empty']
    > &
      Attribute.Required;
    timezone: Attribute.String;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'plugin::content-releases.release',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginContentReleasesReleaseAction
  extends Schema.CollectionType {
  collectionName: 'strapi_release_actions';
  info: {
    displayName: 'Release Action';
    pluralName: 'release-actions';
    singularName: 'release-action';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    contentType: Attribute.String & Attribute.Required;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::content-releases.release-action',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    entry: Attribute.Relation<
      'plugin::content-releases.release-action',
      'morphToOne'
    >;
    isEntryValid: Attribute.Boolean;
    locale: Attribute.String;
    release: Attribute.Relation<
      'plugin::content-releases.release-action',
      'manyToOne',
      'plugin::content-releases.release'
    >;
    type: Attribute.Enumeration<['publish', 'unpublish']> & Attribute.Required;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'plugin::content-releases.release-action',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginUploadFile extends Schema.CollectionType {
  collectionName: 'files';
  info: {
    description: '';
    displayName: 'File';
    pluralName: 'files';
    singularName: 'file';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    alternativeText: Attribute.String;
    caption: Attribute.String;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::upload.file',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    ext: Attribute.String;
    folder: Attribute.Relation<
      'plugin::upload.file',
      'manyToOne',
      'plugin::upload.folder'
    > &
      Attribute.Private;
    folderPath: Attribute.String &
      Attribute.Required &
      Attribute.Private &
      Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
    formats: Attribute.JSON;
    hash: Attribute.String & Attribute.Required;
    height: Attribute.Integer;
    mime: Attribute.String & Attribute.Required;
    name: Attribute.String & Attribute.Required;
    previewUrl: Attribute.String;
    provider: Attribute.String & Attribute.Required;
    provider_metadata: Attribute.JSON;
    related: Attribute.Relation<'plugin::upload.file', 'morphToMany'>;
    size: Attribute.Decimal & Attribute.Required;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'plugin::upload.file',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    url: Attribute.String & Attribute.Required;
    width: Attribute.Integer;
  };
}

export interface PluginUploadFolder extends Schema.CollectionType {
  collectionName: 'upload_folders';
  info: {
    displayName: 'Folder';
    pluralName: 'folders';
    singularName: 'folder';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    children: Attribute.Relation<
      'plugin::upload.folder',
      'oneToMany',
      'plugin::upload.folder'
    >;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::upload.folder',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    files: Attribute.Relation<
      'plugin::upload.folder',
      'oneToMany',
      'plugin::upload.file'
    >;
    name: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
    parent: Attribute.Relation<
      'plugin::upload.folder',
      'manyToOne',
      'plugin::upload.folder'
    >;
    path: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
    pathId: Attribute.Integer & Attribute.Required & Attribute.Unique;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'plugin::upload.folder',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

declare module '@strapi/types' {
  export module Shared {
    export interface ContentTypes {
      'admin::api-token': AdminApiToken;
      'admin::api-token-permission': AdminApiTokenPermission;
      'admin::permission': AdminPermission;
      'admin::role': AdminRole;
      'admin::transfer-token': AdminTransferToken;
      'admin::transfer-token-permission': AdminTransferTokenPermission;
      'admin::user': AdminUser;
      'api::about-us.about-us': ApiAboutUsAboutUs;
      'api::about.about': ApiAboutAbout;
      'api::advertisement.advertisement': ApiAdvertisementAdvertisement;
      'api::article.article': ApiArticleArticle;
      'api::author.author': ApiAuthorAuthor;
      'api::category.category': ApiCategoryCategory;
      'api::ceo-profile.ceo-profile': ApiCeoProfileCeoProfile;
      'api::company-profile.company-profile': ApiCompanyProfileCompanyProfile;
      'api::contact-us.contact-us': ApiContactUsContactUs;
      'api::global.global': ApiGlobalGlobal;
      'api::home-advertisment.home-advertisment': ApiHomeAdvertismentHomeAdvertisment;
      'api::magazine.magazine': ApiMagazineMagazine;
      'api::multimedia-and-youtube.multimedia-and-youtube': ApiMultimediaAndYoutubeMultimediaAndYoutube;
      'api::multimedia-category.multimedia-category': ApiMultimediaCategoryMultimediaCategory;
      'api::news-category.news-category': ApiNewsCategoryNewsCategory;
      'api::news-section.news-section': ApiNewsSectionNewsSection;
      'api::newsletter.newsletter': ApiNewsletterNewsletter;
      'api::pop-up-video.pop-up-video': ApiPopUpVideoPopUpVideo;
      'api::project.project': ApiProjectProject;
      'api::report.report': ApiReportReport;
      'api::services-category.services-category': ApiServicesCategoryServicesCategory;
      'api::services-section.services-section': ApiServicesSectionServicesSection;
      'plugin::content-releases.release': PluginContentReleasesRelease;
      'plugin::content-releases.release-action': PluginContentReleasesReleaseAction;
      'plugin::upload.file': PluginUploadFile;
      'plugin::upload.folder': PluginUploadFolder;
    }
  }
}
