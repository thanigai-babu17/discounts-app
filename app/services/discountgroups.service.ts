import { ConditionRow, Product } from '~/common/types';
import db from '../db.server';
import { CollectionReference, DocumentData, WhereFilterOp } from 'firebase-admin/firestore';
import { calculateDiscount, fixedDiscountToPercentage } from '~/common/utils';

export async function filterProducts(
  criteria: ConditionRow[],
  shop: string
): Promise<Product[] | Error> {
  try {
    let queryRef = db
      .collection(`${shop}_products`)
      .where('status', '==', 'ACTIVE')
      .where('discount_group', '==', null);

    criteria.forEach((c) => {
      queryRef = queryRef.where(c.property_name, c.operator as WhereFilterOp, c.property_value);
    });

    const queryResults = await queryRef.get();
    const queryData: Product[] = queryResults.docs.map((q) => {
      const qData = q.data();
      return {
        id: q.id,
        main_product_id: qData.main_product_id,
        status: qData.status,
        variant_title: qData.variant_title,
        display_name: qData.display_name,
        variant_img: qData.variant_img,
        product_img: qData.product_img,
        tags: qData.tags,
        product_title: qData.product_title,
        product_type: qData.product_type,
        price: qData.price,
        availability: qData.availability,
        collections: qData.collections,
        sku: qData.sku,
        discount_group: qData.discount_group,
      } as Product;
    });

    return queryData;
  } catch (error: any) {
    throw error;
  }
}

export async function createDiscountGroup(shop: string, payload: any, accessToken: any) {
  try {
    const docRef = db.collection(`${shop}_discountgroups`).doc();
    await docRef.set({ status: 'ACTIVE', ...payload.discount_group });
    const batch = db.batch();
    payload.selected_products.forEach((id: any) => {
      const productRef = db.collection(`${shop}_products`).doc(id);
      batch.update(productRef, { discount_group: docRef.id });
    });
    await batch.commit();
    const updatedProducts: any[] = [];
    for (const productId of payload.selected_products) {
      const productRef = db.collection(`${shop}_products`).doc(productId);
      const productDoc = await productRef.get();
      if (productDoc.exists) {
        updatedProducts.push(productDoc.data());
      }
    }
    const groupedProducts = updatedProducts.reduce((acc, product) => {
      const mutationArr = [
        {
          namespace: 'custom',
          key: 'onetime_discount_percentage',
          value:
            payload.discount_group.oneTimeDiscountType === 'PERCENTAGE'
              ? payload.discount_group.oneTimeDiscountVal
              : fixedDiscountToPercentage(
                  parseFloat(product.price),
                  parseFloat(payload.discount_group.oneTimeDiscountVal)
                ),
          type: 'number_decimal',
        },
        {
          namespace: 'custom',
          key: 'onetime_discount_price',
          value: calculateDiscount(
            parseFloat(product.price),
            parseFloat(payload.discount_group.oneTimeDiscountVal),
            payload.discount_group.oneTimeDiscountType
          )?.toString(),
          type: 'number_decimal',
        },
        {
          namespace: 'custom',
          key: 'subscription_discount_percentage',
          value:
            payload.discount_group.subDiscountType === 'PERCENTAGE'
              ? payload.discount_group.subDiscountVal
              : fixedDiscountToPercentage(
                  parseFloat(product.price),
                  parseFloat(payload.discount_group.subDiscountVal)
                ),
          type: 'number_decimal',
        },
        {
          namespace: 'custom',
          key: 'subscription_discount_price',
          value: calculateDiscount(
            parseFloat(product.price),
            parseFloat(payload.discount_group.subDiscountVal),
            payload.discount_group.subDiscountType
          )?.toString(),
          type: 'number_decimal',
        },
      ];
      const existingProduct = acc.find(
        (p: any) => p.productId === `gid://shopify/Product/${product.main_product_id}`
      );
      if (existingProduct) {
        existingProduct.variants.push({
          id: `gid://shopify/ProductVariant/${product.id}`,
          metafields: mutationArr,
        });
      } else {
        acc.push({
          productId: `gid://shopify/Product/${product.main_product_id}`,
          variants: [
            {
              id: `gid://shopify/ProductVariant/${product.id}`,
              metafields: mutationArr,
            },
          ],
        });
      }
      return acc;
    }, []);
    // console.log(groupedProducts, 'updated products');

    const bulkQueryPromises = Promise.allSettled(
      groupedProducts.map(async (product: any) => {
        const { productId, variants } = product;
        const mutationPromises = variants.map(async (variant: any) => {
          const { id, metafields } = variant;
          try {
            const response = await fetch(`https://${shop}/admin/api/2024-01/graphql.json`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': accessToken,
              },
              body: JSON.stringify({
                query: `
                        mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
                            productVariantsBulkUpdate(productId: $productId, variants: $variants) {
                                product {
                                    id
                                }
                                productVariants {
                                    id
                                    metafields(first: 10) {
                                        edges {
                                            node {
                                                namespace
                                                key
                                                value
                                            }
                                        }
                                    }
                                }
                                userErrors {
                                    field
                                    message
                                }
                            }
                        }
                    `,
                variables: {
                  productId,
                  variants: [
                    {
                      id,
                      metafields,
                    },
                  ],
                },
              }),
            });
            return await response.json();
          } catch (error) {
            return { error };
          }
        });
        return Promise.allSettled(mutationPromises);
      })
    );

    bulkQueryPromises
      .then((resp) => {
        console.info('Discounts updated to product', JSON.stringify(resp));
      })
      .catch((err) => {
        console.error('something went wrong with discount update', err);
      });
    return updatedProducts;
  } catch (error) {
    throw error;
  }
}
