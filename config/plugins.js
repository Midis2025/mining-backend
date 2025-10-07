// config/plugins.js
module.exports = ({ env }) => ({
  // ✅ CKEditor configuration
  ckeditor: {
    enabled: true,
    config: {
      editor: {
        // Toolbar options
        toolbar: {
          items: [
            'heading', '|',
            'bold', 'italic', 'underline', 'strikethrough', 'link', '|',
            'bulletedList', 'numberedList', 'blockQuote', '|',
            'insertTable', 'mediaEmbed', 'imageUpload', '|',
            'undo', 'redo', 'sourceEditing'
          ],
        },

        // Heading options
        heading: {
          options: [
            { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' },
            { model: 'heading1', view: 'h1', title: 'Heading 1', class: 'ck-heading_heading1' },
            { model: 'heading2', view: 'h2', title: 'Heading 2', class: 'ck-heading_heading2' },
            { model: 'heading3', view: 'h3', title: 'Heading 3', class: 'ck-heading_heading3' },
          ],
        },

        // Font customization
        fontSize: {
          options: [9, 11, 13, 'default', 17, 19, 21],
        },
        fontFamily: {
          options: [
            'default',
            'Arial, Helvetica, sans-serif',
            'Courier New, Courier, monospace',
            'Georgia, serif',
            'Times New Roman, Times, serif',
            'Roboto, sans-serif',
          ],
        },

        // Table customization
        table: {
          contentToolbar: [
            'tableColumn', 'tableRow', 'mergeTableCells',
            'tableCellProperties', 'tableProperties'
          ],
        },

        // Image customization
        image: {
          toolbar: [
            'imageTextAlternative',
            'imageStyle:inline',
            'imageStyle:block',
            'imageStyle:side',
            '|',
            'resizeImage'
          ],
        },
      },
    },
  },

  // ✅ Google Login configuration
  'users-permissions': {
    config: {
      providers: {
        google: {
          enabled: true,
          icon: 'google',
          key: env('GOOGLE_CLIENT_ID'),
          secret: env('GOOGLE_CLIENT_SECRET'),
          callback: `${env('STRAPI_URL')}/api/connect/google/callback`,
          redirectUri: `${env('STRAPI_URL')}/api/connect/google/callback`,
          scope: ['email', 'profile'],
        },
      },
    },
  },
});
