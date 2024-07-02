import { ConditionRow, DiscountValueType, ProdsMetaIds } from './types';

/**
 * Mutates and returns the image url to a specific size and resolution
 * @param url original image Url
 * @param size size of the desired image
 * @returns {string}
 */
export function imgUrl(url: string, size: string): string {
  return url
    .replace(
      /_(pico|icon|thumb|small|compact|medium|large|grande|original|1024x1024|2048x2048|master)+\./g,
      '.'
    )
    .replace(/\.jpg|\.png|\.gif|\.jpeg/g, function (match) {
      return '_' + size + match;
    });
}

/**
 * Extracts the product ID from a Shopify ProductVariant identifier.
 *
 * @param {string} shopifyId - The full Shopify ProductVariant identifier string.
 * @returns {string} The extracted product ID.
 */
export function extractProductId(shopifyId: string): number {
  const parts = shopifyId.split('/');
  return parseInt(parts[parts.length - 1]);
}

/**
 * Calculates the discounted price based on the given discount value and type.
 *
 * @param {number} price - The original price of the product.
 * @param {number} discountValue - The value of the discount.
 * @param {'PERCENTAGE' | 'FIXED'} discountValueType - The type of the discount, either 'PERCENTAGE' or 'FIXED'.
 * @returns {number | null} - The discounted price, or null if the discount value is 0, undefined, or null.
 */
export function calculateDiscountPrice(
  price: number,
  discountValue: number,
  discountValueType: 'PERCENTAGE' | 'FIXED'
): number | undefined {
  if (discountValue === 0) return 0;
  if (discountValueType === 'PERCENTAGE') {
    let discountedPrice = price * (discountValue / 100);
    return Number(roundNumber(price - discountedPrice, false));
  } else if (discountValueType === 'FIXED') {
    return Math.abs(price - discountValue);
  }
}
/*
 * @param {number} num - The number to round.
 * @param {boolean} savings - A flag indicating whether to apply savings logic.
 * @param {number} [precision=2] - The number of decimal places to round to. Default is 2.
 * @returns {string} - The rounded number as a string with the specified precision.
 * @throws {Error} - Throws an error if the input is not a number.
 */
export function roundNumber(num: number, savings: boolean, precision: number = 2): string {
  let decimalPart = num.toFixed(3).split('.')[1];
  let lastDigit = parseInt(decimalPart.slice(2));

  if (lastDigit > 4 && !savings) {
    let number = Math.ceil((num + Number.EPSILON) * 100) / 100;
    return number.toFixed(precision);
  } else if (lastDigit < 6 && savings) {
    let number = Math.floor((num + Number.EPSILON) * 100) / 100;
    return number.toFixed(precision);
  } else {
    let number = Math.round((num + Number.EPSILON) * 100) / 100;
    return number.toFixed(precision);
  }
}

/**
 * Converts a fixed discount amount to a percentage of the original price.
 *
 * @param {number} price - The original price of the product.
 * @param {number} fixedDiscount - The fixed discount amount.
 * @returns {number} - The discount as a percentage of the original price.
 */
export function fixedDiscountToPercentage(price: number, fixedDiscount: number): string {
  const discountVal = (fixedDiscount / price) * 100;
  return discountVal.toFixed(2);
}

/**
 * Replaces dots with underscores in a given name.
 * @param {string} name - The name to sanitize.
 * @returns {string} The sanitized name with dots replaced by underscores.
 */
export function tableNamePrefix(name: string): string {
  return name.replace(/\./g, '_');
}

export function getDiscountPercentage(
  price: number,
  discountValue: number,
  type: DiscountValueType
): string {
  if (type === 'PERCENTAGE') return discountValue.toString();
  return fixedDiscountToPercentage(price, discountValue);
}

export function groupVariantsByProdIdNoMetaIds(
  productArr: ProdsMetaIds[],
  discounts: {
    oneTimeDiscountVal: string;
    oneTimeDiscountType: DiscountValueType;
    subDiscountType: DiscountValueType;
    subDiscountVal: string;
  }
) {
  const groupedProducts = productArr.reduce((acc: any, product) => {
    const mutationArr = [
      {
        namespace: 'a360_discounts',
        key: 'onetime_discount_percentage',
        value: getDiscountPercentage(
          product.price,
          parseFloat(discounts.oneTimeDiscountVal),
          discounts.oneTimeDiscountType
        ),
        type: 'number_decimal',
      },
      {
        namespace: 'a360_discounts',
        key: 'onetime_discount_price',
        value: calculateDiscountPrice(
          product.price,
          parseFloat(discounts.oneTimeDiscountVal),
          discounts.oneTimeDiscountType
        )?.toString(),
        type: 'number_decimal',
      },
      {
        namespace: 'a360_discounts',
        key: 'subscription_discount_percentage',
        value: getDiscountPercentage(
          product.price,
          parseFloat(discounts.subDiscountVal),
          discounts.subDiscountType
        ),
        type: 'number_decimal',
      },
      {
        namespace: 'a360_discounts',
        key: 'subscription_discount_price',
        value: calculateDiscountPrice(
          product.price,
          parseFloat(discounts.subDiscountVal),
          discounts.subDiscountType
        )?.toString(),
        type: 'number_decimal',
      },
    ];
    const existingProduct: any = acc.find(
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

  return groupedProducts;
}

export function groupVariantsByProdIdWithMetaIds(
  productArr: ProdsMetaIds[],
  discounts: {
    oneTimeDiscountVal: string;
    oneTimeDiscountType: DiscountValueType;
    subDiscountType: DiscountValueType;
    subDiscountVal: string;
  }
) {
  const groupedProducts = productArr.reduce((acc: any, product) => {
    const mutationArr = [
      {
        id: product.onetime_discount_percentage,
        value: getDiscountPercentage(
          product.price,
          parseFloat(discounts.oneTimeDiscountVal),
          discounts.oneTimeDiscountType
        ),
      },
      {
        id: product.onetime_discount_price,
        value: calculateDiscountPrice(
          product.price,
          parseFloat(discounts.oneTimeDiscountVal),
          discounts.oneTimeDiscountType
        )?.toString(),
      },
      {
        id: product.subscription_discount_percentage,
        value: getDiscountPercentage(
          product.price,
          parseFloat(discounts.subDiscountVal),
          discounts.subDiscountType
        ),
      },
      {
        id: product.subscription_discount_price,
        value: calculateDiscountPrice(
          product.price,
          parseFloat(discounts.subDiscountVal),
          discounts.subDiscountType
        )?.toString(),
      },
    ];
    const existingProduct: any = acc.find(
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

  return groupedProducts;
}

export async function bulkUpdateShopifyProductVariants(
  inputData: any[],
  shop: string,
  accessToken: string
): Promise<any> {
  return Promise.allSettled(
    inputData.map(async (input: any) => {
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
                          metafields(first: 10,namespace:"a360_discounts") {
                              edges {
                                  node {
                                      namespace
                                      key
                                      id
                                  }
                              }
                          }
                      }
                      userErrors {
                          field
                          message
                      }
                  }
              }`,
            variables: input,
          }),
        });
        return await response.json();
      } catch (error) {
        return error;
      }
    })
  );
}

export function buildConditionStrFields(criteria: ConditionRow): ConditionRow {
  let pattern = '';
  let operator = 'like';
  if (criteria.operator === 'like') {
    pattern = `%${criteria.property_value}%`;
  } else if (criteria.operator === 'starts-with') {
    pattern = `%${criteria.property_value}%`;
  } else if (criteria.operator === 'ends-with') {
    pattern = `%${criteria.property_value}%`;
  } else {
    pattern = criteria.property_value;
    operator = criteria.operator;
  }
  return {
    property_name: criteria.property_name,
    operator: operator,
    property_value: pattern,
  };
}

export function buildConditionArrFields(criteria: ConditionRow): ConditionRow {
  let propertyName = '';
  let operator = 'like';
  let pattern = '';
  if (
    criteria.operator === 'like' ||
    criteria.operator === 'starts-with' ||
    criteria.operator === 'ends-with'
  ) {
    propertyName = `${criteria.property_name}_str`;
  }
  if (criteria.operator === 'like') {
    pattern = `%${criteria.property_value}%`;
  }
  if (criteria.operator === 'starts-with') {
    pattern = `%${criteria.property_value}%`;
  }
  if (criteria.operator === 'ends-with') {
    pattern = `%${criteria.property_value}%`;
  }
  return { property_name: propertyName, operator, property_value: pattern };
}

export function createMutInputProdsWMetaIds(products: ProdsMetaIds[], discountConfig: any): any[] {
  return groupVariantsByProdIdWithMetaIds(
    products.filter(
      (p) =>
        p.onetime_discount_percentage != null ||
        p.onetime_discount_price != null ||
        p.subscription_discount_percentage != null ||
        p.subscription_discount_price != null
    ),
    discountConfig
  );
}

export function createMutInputProdsNoMetaIds(products: ProdsMetaIds[], discountConfig: any): any[] {
  return groupVariantsByProdIdNoMetaIds(
    products.filter(
      (p) =>
        p.onetime_discount_percentage == null ||
        p.onetime_discount_price == null ||
        p.subscription_discount_percentage == null ||
        p.subscription_discount_price == null
    ),
    discountConfig
  );
}
