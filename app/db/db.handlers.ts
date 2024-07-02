import { tableNamePrefix } from '~/common/utils';
import db from './db.server';

export async function createProductTable(shopName: string): Promise<any> {
  try {
    const tableName = tableNamePrefix(`${shopName}_products`);
    const discountTableName = tableNamePrefix(`${shopName}_discountgroups`);
    const tableExists = await db.schema.hasTable(tableName);
    if (!tableExists) {
      await db.schema.createTable(tableName, (table) => {
        table.bigInteger('id').primary();
        table.bigInteger('main_product_id').notNullable();
        table.string('status').notNullable();
        table.string('variant_title').notNullable();
        table.string('display_name').notNullable();
        table.string('product_title').notNullable();
        table.string('product_type');
        table.float('price').notNullable();
        table.boolean('availability');
        table.string('variant_img');
        table.string('product_img');
        table.text('tags_str');
        table.specificType('tags_arr', 'text[]');
        table.text('collections_str');
        table.specificType('collections_arr', 'text[]');
        table.string('sku');
        table.string('onetime_discount_percentage');
        table.string('onetime_discount_price');
        table.string('subscription_discount_percentage');
        table.string('subscription_discount_price');
        table.integer('discount_group').references('id').inTable(discountTableName);
      });
    }
    return { status: true };
  } catch (error) {
    throw error;
  }
}

export async function createDiscountGroupTable(shopName: string): Promise<any> {
  try {
    const tableName = tableNamePrefix(`${shopName}_discountgroups`);
    const tableExists = await db.schema.hasTable(tableName);
    if (!tableExists) {
      await db.schema.createTable(tableName, (table) => {
        table.increments('id').primary();
        table.string('status').notNullable().defaultTo('ACTIVE');
        table.string('handle').notNullable();
        table.string('sub_discount_type').notNullable();
        table.float('sub_discount_value').notNullable();
        table.string('onetime_discount_type').notNullable();
        table.float('onetime_discount_value').notNullable();
        table.json('criterias').notNullable();
        table.timestamp('created_at').notNullable().defaultTo(db.fn.now());
        table.timestamp('updated_at').notNullable().defaultTo(db.fn.now());
      });
    }
    return { status: true };
  } catch (error) {
    throw error;
  }
}

// export async function createDiscountProductMapTable(shopName: string): Promise<any> {
//   try {
//     const tableName = tableNamePrefix(`${shopName}_discount_product_map`);
//     const productTableName = tableNamePrefix(`${shopName}_products`);
//     const discountTableName = tableNamePrefix(`${shopName}_discountgroups`);
//     const tableExists = await db.schema.hasTable(tableName);
//     if (!tableExists) {
//       await db.schema.createTable(tableName, (table) => {
//         table.increments('id').primary();
//         table.integer('discount_id').references('id').inTable(discountTableName);
//         table.bigInteger('product_id').references('id').inTable(productTableName);
//         table.timestamp('created_at').notNullable().defaultTo(db.fn.now());
//       });
//     }
//     return { status: true };
//   } catch (error) {
//     throw error;
//   }
// }

export async function createStoreSettingsTable(): Promise<any> {
  try {
    const tableName = `store_settings`;
    const tableExists = await db.schema.hasTable(tableName);
    if (!tableExists) {
      await db.schema.createTable(tableName, (table) => {
        table.increments('id').primary();
        table.string('shop').notNullable();
        table.string('product_sync_status').notNullable().defaultTo('YET_TO_START');
        table.json('metafields_def');
        table.timestamp('created_at').notNullable().defaultTo(db.fn.now());
        table.timestamp('updated_at').notNullable().defaultTo(db.fn.now());
      });
    }
    return { status: true };
  } catch (error) {
    throw error;
  }
}

export async function initDBSetupOnNewInstall(shopName: string): Promise<any> {
  try {
    const tableCreationResp = [
      await createDiscountGroupTable(shopName),
      await createProductTable(shopName),
    ];
    return tableCreationResp;
  } catch (error) {
    throw error;
  }
}
