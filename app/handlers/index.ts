import stream from 'stream';
import { promisify } from 'util';
const pipeline = promisify(stream.pipeline);
import fs from 'fs';
import readline from 'readline';
import db from '../db/db.server';
import { tableNamePrefix, extractProductId } from '~/common/utils';
import { createProductTable } from '~/db/db.handlers';

/**
 * handles product bulk query when bulk query is done downloads the file and syncs with firestore db
 * @param {string} fileUrl - file url of the bulk query result
 * @param {string} shop - shopify store name
 */
export async function productBulkQueryHandler(fileUrl: string, shop: string): Promise<void> {
  try {
    const outputPath = `${shop}_${Date.now()}_product_export.jsonl`;
    await downloadFile(fileUrl, outputPath);
    await processFile(outputPath, shop);
    console.info('product bulk query synced with DB sucessfully');
  } catch (error: any) {
    console.error('Error while processing bulk query file', error);
  }
}

/**
 * Downloads the file from the given path
 * @param url - file url of the bulk query result
 * @param outputPath - file path where the the temp file will be created
 */
async function downloadFile(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }

  await pipeline(response.body as unknown as stream.Readable, fs.createWriteStream(outputPath));
  console.log(`File downloaded to ${outputPath}`);
}

/**
 * Reads the data from the temp file modifies it accordingly to bulk write into the firestore DB and deletes the file once done
 * @param filePath - temp file path
 * @param shopName - name of the store to create collection with the store prefix <shopName>_products
 */
async function processFile(filePath: string, shopName: string): Promise<void> {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const variantBulkData: any[] = [];
  const collectionPendingData: any = {};
  const metafieldPendingData: any = {};

  for await (const line of rl) {
    const json = JSON.parse(line);
    if (!json.__parentId) {
      const variantData = {
        id: extractProductId(json.id),
        main_product_id: extractProductId(json.product.id),
        status: json.product.status,
        variant_title: json.title,
        display_name: json.displayName,
        variant_img: json.image?.url || null,
        product_img: json.product.featuredImage?.url || null,
        tags_arr: json.product.tags,
        tags_str: json.product.tags ? json.product.tags.toString() : null,
        product_title: json.product.title,
        product_type: json.product.productType,
        price: json.price,
        availability: json.availableForSale,
        collections_arr: [],
        collections_str: '',
        sku: json.sku,
        discount_group: null,
        onetime_discount_percentage: null,
        onetime_discount_price: null,
        subscription_discount_percentage: null,
        subscription_discount_price: null,
      };
      variantBulkData.push(variantData);
    } else {
      let parentId = extractProductId(json.__parentId);
      const variantIndex = variantBulkData.findIndex((variant) => variant.id === parentId);
      if (json.id.includes('Collection')) {
        if (variantIndex !== -1) {
          variantBulkData[variantIndex].collections_arr.push(json.title);
          if (
            variantBulkData[variantIndex].collections_str &&
            variantBulkData[variantIndex].collections_str.length
          ) {
            variantBulkData[variantIndex].collections_str = variantBulkData[
              variantIndex
            ].collections_str.concat(',', json.title);
          } else {
            variantBulkData[variantIndex].collections_str = json.title;
          }
        } else {
          collectionPendingData[parentId] = json.title;
        }
      }

      if (json.id.includes('Metafield')) {
        if (variantIndex !== -1) {
          variantBulkData[variantIndex][json.key] = json.id;
        } else {
          metafieldPendingData[parentId] = {
            key: json.key,
            id: json.id,
          };
        }
      }
    }
  }

  for (let key in collectionPendingData) {
    if (collectionPendingData.hasOwnProperty(key)) {
      const variantIndex = variantBulkData.findIndex((variant) => variant.variant_id === key);
      if (variantIndex !== -1) {
        variantBulkData[variantIndex].collections_arr.push(collectionPendingData[key]);
        if (
          variantBulkData[variantIndex].collections_str &&
          variantBulkData[variantIndex].collections_str.length
        ) {
          variantBulkData[variantIndex].collections_str = variantBulkData[
            variantIndex
          ].collections_str.concat(',', collectionPendingData[key]);
        } else {
          variantBulkData[variantIndex].collections_str = collectionPendingData[key];
        }
      }
      delete collectionPendingData[key];
    }
  }

  for (let Idkey in metafieldPendingData) {
    if (metafieldPendingData.hasOwnProperty(Idkey)) {
      const variantIndex = variantBulkData.findIndex((variant) => variant.variant_id === Idkey);
      if (variantIndex !== -1) {
        variantBulkData[variantIndex][metafieldPendingData[Idkey].key] =
          metafieldPendingData[Idkey].id;
      }
      delete metafieldPendingData[Idkey];
    }
  }

  await db(tableNamePrefix(`${shopName}_products`)).insert(variantBulkData);
  fs.unlink(filePath, (err) => {
    if (err) {
      console.error('Error deleting temporary file:', err);
    } else {
      console.log('Temporary file deleted successfully');
    }
  });
  await db('product_sync').where('shop', shopName).update({
    status: 'COMPLETE',
  });
}
