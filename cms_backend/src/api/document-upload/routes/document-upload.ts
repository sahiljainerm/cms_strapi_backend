export default {
  routes: [
    {
      method: 'POST',
      path: '/upload-documents',
      handler: 'document-upload.uploadCsv',
      config: {
        auth: false,
      },
    },
  ],
};
