import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { Context } from 'koa';

interface DocumentCsvRow {
  SF_Number?: string;
  Unique_Id?: string;
  Description?: string;
  Client_Name?: string;
  Client_Type?: string;
  Client_Contact?: string;
  Client_Contact_Buying_Center?: string;
  Client_Journey?: string;
  Document_Confidentiality?: string;
  Document_Type?: string;
  Document_Sub_Type?: string;
  Document_Value_Range?: string;
  Document_Outcome?: string;
  Last_Stage_Change_Date?: string;
  Industry?: string;
  Sub_Industry?: string;
  Service?: string;
  Sub_Service?: string;
  Business_Unit?: string;
  Region?: string;
  Country?: string;
  State?: string;
  City?: string;
  Author?: string;
  Commercial_Program?: string;
  SMEs?: string;
  Competitors?: string;
  Attachments?: string;
manualOverride?: boolean;
}

export async function processCsvFileFromPath(filePath: string) {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const records: DocumentCsvRow[] = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
  });

  const created: string[] = [];
  const updated: string[] = [];

  for (const row of records) {
    const data: Record<string, any> = {
      SF_Number: row.SF_Number || '',
      Unique_Id: row.Unique_Id || '',
      Description: row.Description || '',
      Client_Name: row.Client_Name || '',
      Client_Type: row.Client_Type || '',
      Client_Contact: row.Client_Contact || '',
      Client_Contact_Buying_Center: row.Client_Contact_Buying_Center || '',
      Client_Journey: row.Client_Journey || '',
      Document_Confidentiality: row.Document_Confidentiality || '',
      Document_Type: row.Document_Type || '',
      Document_Sub_Type: row.Document_Sub_Type || '',
      Document_Value_Range: row.Document_Value_Range || '',
      Document_Outcome: row.Document_Outcome || '',
      Last_Stage_Change_Date: row.Last_Stage_Change_Date || '',
      Industry: row.Industry || '',
      Sub_Industry: row.Sub_Industry || '',
      Service: row.Service || '',
      Sub_Service: row.Sub_Service || '',
      Business_Unit: row.Business_Unit || '',
      Region: row.Region || '',
      Country: row.Country || '',
      State: row.State || '',
      City: row.City || '',
      Author: row.Author || '',
      Commercial_Program: row.Commercial_Program || '',
      SMEs: row.SMEs || '',
      Competitors: row.Competitors || '',
    };

    // Match attachments from Media Library
    let uploadedFileId: number | null = null;

    if (row.Attachments && typeof row.Attachments === 'string') {
      const proposalFileName = path.basename(row.Attachments).trim();

      const found = await strapi.entityService.findMany('plugin::upload.file', {
        filters: {
          name: {
            $eqi: proposalFileName,
          },
        },
        limit: 1,
      });

      const idValue = found?.[0]?.id;
      if (typeof idValue === 'string' && /^\d+$/.test(idValue)) {
        uploadedFileId = parseInt(idValue, 10);
      } else if (typeof idValue === 'number') {
        uploadedFileId = idValue;
      } else {
        strapi.log.warn(`⚠️ File ID for ${proposalFileName} is not valid`);
      }

      if (uploadedFileId) {
        strapi.log.info(`✅ Matched uploaded file: ${proposalFileName} (ID: ${uploadedFileId})`);
      } else {
        strapi.log.warn(`⚠️ No uploaded file matched for Proposal: ${proposalFileName}`);
      }
    }

    const rawDescription = row.Description?.trim() || '';

    data.Description = rawDescription
      ? [
          {
            type: 'paragraph',
            children: [
              {
                type: 'text',
                text: rawDescription,
              },
            ],
          },
        ]
      : [];

    if (uploadedFileId) {
      data.Attachments = uploadedFileId;
    }

    // Check if document already exists
    const existing = await strapi.db.query('api::document-store.document-store').findOne({
      where: { SF_Number: data.SF_Number },
    });

    if (existing) {
      await strapi.entityService.update('api::document-store.document-store', existing.id, {
        data: {
          ...(data as any),
          manualOverride: true,
        },
      });
      updated.push(data.SF_Number);
    } else {
      await strapi.entityService.create('api::document-store.document-store', {
        data: {
          ...(data as any),
          manualOverride: true,
        },
      });
      created.push(data.SF_Number);
    }
  }

  strapi.log.info(`Created: ${created.length}, Updated: ${updated.length}`);
  return { created, updated };
}

export default {
  async uploadCsv(ctx: Context) {
    const files = (ctx.request as any).files;
    if (!files?.file) return ctx.badRequest('CSV file is required.');

    const filePath = files.file.filepath;
    if (!filePath) return ctx.badRequest('Invalid file path');
    ctx.state.isBulkImport = true;

    const result = await processCsvFileFromPath(filePath);

    ctx.send({
      message: 'CSV upload complete',
      createdCount: result.created.length,
      updatedCount: result.updated.length,
    });
  },

  processCsvFileFromPath,
};
