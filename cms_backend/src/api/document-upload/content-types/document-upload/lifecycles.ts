import path from 'path';
import fs from 'fs';
import uploadDoc from '../../../document-upload/controllers/document-upload';

export default {
  async afterCreate(event) {
    const entry = await strapi.entityService.findOne('api::document-upload.document-upload', event.result.id, {
      populate: ['document_file'],
    });

    const files = (entry as any).document_file;
    if (!files?.length) {
      strapi.log.warn('No document_file found.');
      return;
    }

    const file = files[0];
    const relativeUrl = file.url;
    if (!relativeUrl) {
      strapi.log.warn('Missing file URL.');
      return;
    }

    const filePath = path.resolve('public', relativeUrl.replace(/^\/+/, ''));
    if (!fs.existsSync(filePath)) {
      strapi.log.error(`File not found: ${filePath}`);
      return;
    }

    await uploadDoc.processCsvFileFromPath(filePath);
    strapi.log.info(`✅ Processed CSV: ${filePath}`);
  },
};
