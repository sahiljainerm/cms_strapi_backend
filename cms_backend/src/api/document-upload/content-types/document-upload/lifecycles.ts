import path from 'path';
import fs from 'fs';
import uploadDoc from '../../../document-upload/controllers/document-upload';
import axios from 'axios';
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

    const filePath = file.url//path.resolve(relativeUrl.replace(/^\/+/, ''));
    
    

async function checkFileExists(filePath: string): Promise<boolean> {
  if (/^https?:\/\//i.test(filePath)) {
    // For remote URL, check by making HEAD request
    try {
      await axios.head(filePath);
      return true;
    } catch {
      return false;
    }
  } else {
    // Local path
    return fs.existsSync(filePath);
  }
}
    const file_exists = await checkFileExists(filePath);
if (!file_exists) {
  strapi.log.error(`File not found: ${filePath}`);
  return;
}

    await uploadDoc.processCsvFileFromPath(filePath);
    strapi.log.info(`✅ Processed CSV: ${filePath}`);
  },
};
