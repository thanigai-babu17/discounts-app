import stream from 'stream';
import { promisify } from 'util';
const pipeline = promisify(stream.pipeline);
import fs from 'fs';
import readline from 'readline';
import db from '../db.server';
import { extractProductId } from '~/common/utils';

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

  for await (const line of rl) {
    const json = JSON.parse(line);
    if (!json.__parentId) {
      const variantData = {
        id: extractProductId(json.id),
        main_product_id: json.product.id,
        status: json.product.status,
        variant_title: json.title,
        display_name: json.displayName,
        variant_img: json.image?.url || null,
        product_img: json.product.featuredImage?.url || null,
        tags: json.product.tags,
        product_title: json.product.title,
        product_type: json.product.productType,
        price: json.price,
        availability: json.availableForSale,
        collections: [],
        sku: json.sku,
        discount_group: null,
      };
      variantBulkData.push(variantData);
    } else {
      let parentId = extractProductId(json.__parentId);
      const variantIndex = variantBulkData.findIndex((variant) => variant.id === parentId);
      if (variantIndex !== -1) {
        variantBulkData[variantIndex].collections.push(json.title);
      } else {
        collectionPendingData[parentId] = json.title;
      }
    }
  }

  for (let key in collectionPendingData) {
    if (collectionPendingData.hasOwnProperty(key)) {
      const variantIndex = variantBulkData.findIndex((variant) => variant.variant_id === key);
      if (variantIndex !== -1) {
        variantBulkData[variantIndex].collections.push(collectionPendingData[key]);
      }
      delete collectionPendingData[key];
    }
  }

  const BATCH_SIZE = 498;
  for (let i = 0; i < variantBulkData.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const batchData = variantBulkData.slice(i, i + BATCH_SIZE);
    batchData.forEach((entry) => {
      const docRef = db.collection(`${shopName}_products`).doc(entry.id);
      batch.set(docRef, entry);
    });
    await batch.commit();
  }

  fs.unlink(filePath, (err) => {
    if (err) {
      console.error('Error deleting temporary file:', err);
    } else {
      console.log('Temporary file deleted successfully');
    }
  });

  const docRef = db.collection('product_sync');
  docRef
    .where('shop', '==', shopName)
    .get()
    .then((querySnapshot) => {
      querySnapshot.forEach((doc) => {
        docRef.doc(doc.id).update({ status: 'COMPLETE' });
      });
    });
}
