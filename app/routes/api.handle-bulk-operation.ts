import { LoaderFunctionArgs, json } from '@remix-run/node';
import fs from 'fs';
import readline from 'readline';

const mutationArr = [
  {
    namespace: 'a360_discounts',
    key: 'onetime_discount_percentage',
    value: '0.0',
    type: 'number_decimal',
  },
  {
    namespace: 'a360_discounts',
    key: 'onetime_discount_price',
    value: '0.0',
    type: 'number_decimal',
  },
  {
    namespace: 'a360_discounts',
    key: 'subscription_discount_percentage',
    value: '0.0',
    type: 'number_decimal',
  },
  {
    namespace: 'a360_discounts',
    key: 'subscription_discount_price',
    value: '0.0',
    type: 'number_decimal',
  },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const filePath = 'aromacrtest.myshopify.com_1718102900728_product_export.jsonl';
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const products: Record<
    string,
    { productId: string; variants: Array<{ id: string; metafields: typeof mutationArr }> }
  > = {};

  for await (const line of rl) {
    const json = JSON.parse(line);

    if (!json.__parentId) {
      const productId = json.product.id;
      const variantId = json.id;

      if (!products[productId]) {
        products[productId] = {
          productId: productId,
          variants: [],
        };
      }

      products[productId].variants.push({
        id: variantId,
        metafields: mutationArr,
      });
    }
  }

  const bulkMutation = Object.values(products);
  const bulkQueryPromises = bulkMutation.map(async (product) => {
    try {
      const response = await fetch(
        `https://aromacrtest.myshopify.com/admin/api/2024-01/graphql.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': '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',
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
              productId: product.productId,
              variants: product.variants,
            },
          }),
        }
      );
      return await response.json();
    } catch (error) {
      return { error };
    }
  });

  const mutationResults = await Promise.allSettled(bulkQueryPromises);

  // Return the mutation results
  return json(mutationResults);
};
