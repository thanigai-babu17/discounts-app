import { ConditionRow, Product } from '~/common/types';
import db from '../db/db.server';
import {
  tableNamePrefix,
  bulkUpdateShopifyProductVariants,
  extractProductId,
  buildConditionArrFields,
  buildConditionStrFields,
  createMutInputProdsWMetaIds,
  createMutInputProdsNoMetaIds,
  createMutInputDiscountDelete,
} from '~/common/utils';

export async function filterProducts(criteria: ConditionRow[], shop: string): Promise<Product[]> {
  try {
    let queryData = db(tableNamePrefix(`${shop}_products`)).select(
      'id',
      'main_product_id',
      'status',
      'display_name',
      'product_img',
      'variant_img',
      'tags_arr',
      'collections_arr',
      'price',
      'discount_group'
    );
    criteria.forEach((c) => {
      if (c.property_name === 'collections' || c.property_name === 'tags') {
        const { property_name, property_value, operator } = buildConditionArrFields(c);
        console.log(property_name, property_value, operator, 'operators');
        queryData = queryData.andWhere(property_name, operator, property_value);
      } else {
        const { property_name, property_value, operator } = buildConditionStrFields(c);
        queryData = queryData.andWhere(property_name, operator, property_value);
      }
    });
    queryData = queryData.andWhere('discount_group', null);
    return queryData;
  } catch (error: any) {
    throw error;
  }
}

export async function filterProductsForDiscountGrp(
  criteria: ConditionRow[],
  shop: string,
  discountGroupId: string
): Promise<Product[]> {
  try {
    let queryData = db(tableNamePrefix(`${shop}_products`)).select(
      'id',
      'main_product_id',
      'status',
      'display_name',
      'product_img',
      'variant_img',
      'tags_arr',
      'collections_arr',
      'price',
      'discount_group'
    );
    criteria.forEach((c) => {
      if (c.property_name === 'collections' || c.property_name === 'tags') {
        const { property_name, property_value, operator } = buildConditionArrFields(c);
        console.log(property_name, property_value, operator, 'operators');
        queryData = queryData.andWhere(property_name, operator, property_value);
      } else {
        const { property_name, property_value, operator } = buildConditionStrFields(c);
        queryData = queryData.andWhere(property_name, operator, property_value);
      }
    });
    queryData = queryData.where(function () {
      this.where('discount_group', discountGroupId).orWhere('discount_group', null);
    });
    console.log(queryData.toQuery(), 'RAW QUERY!!');
    return queryData;
  } catch (error: any) {
    throw error;
  }
}

export async function createDiscountGroup(shop: string, payload: any, accessToken: any) {
  try {
    console.log(payload, 'payload');
    const newDiscountGroup: any[] = await db(tableNamePrefix(`${shop}_discountgroups`))
      .returning(['id'])
      .insert({
        handle: payload.discount_group.handle,
        status: 'ACTIVE',
        sub_discount_type: payload.discount_group.subDiscountType,
        sub_discount_value: parseFloat(payload.discount_group.subDiscountVal),
        onetime_discount_type: payload.discount_group.oneTimeDiscountType,
        onetime_discount_value: parseFloat(payload.discount_group.oneTimeDiscountVal),
        criterias: JSON.stringify(payload.discount_group.criterias),
      });

    const responseBody: any = {};
    responseBody.discountGroup = newDiscountGroup;
    const selectedProductRecords = await db(tableNamePrefix(`${shop}_products`))
      .select(
        'id',
        'main_product_id',
        'price',
        'onetime_discount_percentage',
        'onetime_discount_price',
        'subscription_discount_percentage',
        'subscription_discount_price'
      )
      .whereIn('id', payload.selected_products);

    const productWithMetafieldIds = createMutInputProdsWMetaIds(
      selectedProductRecords,
      payload.discount_group
    );

    const productWithOutMetafieldIds = createMutInputProdsNoMetaIds(
      selectedProductRecords,
      payload.discount_group
    );

    if (productWithMetafieldIds.length) {
      const bulkupdateResp = await bulkUpdateShopifyProductVariants(
        productWithMetafieldIds,
        shop,
        accessToken
      );
      responseBody.productWithMetafieldIds = bulkupdateResp;
    }

    if (productWithOutMetafieldIds.length) {
      const bulkupdateResp = await bulkUpdateShopifyProductVariants(
        productWithOutMetafieldIds,
        shop,
        accessToken
      );
      bulkUpdateMetaFieldIds(bulkupdateResp, shop)
        .then((resp) => {
          console.log('completed updating metafield ids');
        })
        .catch((err) => {
          console.error(err, 'error while updating metafieldIds');
        });
      responseBody.productWithOutMetafieldIds = bulkupdateResp;
    }

    await db(tableNamePrefix(`${shop}_products`))
      .update({
        discount_group: newDiscountGroup[0].id,
      })
      .whereIn('id', payload.selected_products);

    return responseBody;
    //   return updatedProducts;
  } catch (error) {
    throw error;
  }
}

export async function deleteDiscountGroup(ids: string[], accessToken: string, shop: string) {
  try {
    const productsUnderDiscountGrp = await db(tableNamePrefix(`${shop}_products`))
      .select(
        'id',
        'main_product_id',
        'price',
        'onetime_discount_percentage',
        'onetime_discount_price',
        'subscription_discount_percentage',
        'subscription_discount_price'
      )
      .whereIn('discount_group', ids);
    const productMutInput = createMutInputDiscountDelete(productsUnderDiscountGrp);
    if (productMutInput && productMutInput.length) {
      await bulkUpdateShopifyProductVariants(productMutInput, shop, accessToken);
    }
    await db(tableNamePrefix(`${shop}_products`))
      .whereIn('discount_group', ids)
      .del();
    await db(tableNamePrefix(`${shop}_discountgroups`))
      .whereIn('id', ids)
      .del();
    return { status: true, deletedId: ids };
  } catch (error) {
    throw error;
  }
}

function bulkUpdateMetaFieldIds(bulkupdateResp: any[], shop: string) {
  const updatePromises = bulkupdateResp.map(async (req) => {
    const { product, productVariants, userErrors } = req?.value?.data?.productVariantsBulkUpdate;

    const variantUpdatePromises = productVariants.map(async (variant: any) => {
      const id = variant.id;
      const payloadData = variant.metafields.edges.reduce((acc: any, edge: any) => {
        const { key, id: metafieldId } = edge.node;
        acc[`${key}`] = metafieldId;
        return acc;
      }, {});

      return db(tableNamePrefix(`${shop}_products`))
        .update(payloadData)
        .where('id', extractProductId(id));
    });

    return Promise.all(variantUpdatePromises);
  });

  return Promise.all(updatePromises);
}
