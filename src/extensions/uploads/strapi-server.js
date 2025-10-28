"use strict";

const path = require("path");
const slugify = require("slugify");

module.exports = (plugin) => {
  // Lifecycle to rename and move uploaded files before saving
  plugin.controllers.upload.create = async (ctx) => {
    const { files } = ctx.request.files;

    // Support both single and multiple file uploads
    const allFiles = Array.isArray(files) ? files : [files];

    for (const file of allFiles) {
      // Generate SEO-friendly name
      const originalName = path.parse(file.name).name;
      const ext = path.extname(file.name);
      const seoName = slugify(originalName, { lower: false, strict: true });
      
      // Place under Ceos folder
      file.name = `${seoName}${ext}`;
      file.path = path.join("uploads", "Ceos", file.name);
      file.folderPath = "/Ceos"; // For strapi media folder structure
    }

    return plugin.controllers.upload.create(ctx);
  };

  return plugin;
};
