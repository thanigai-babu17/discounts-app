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
export function extractProductId(shopifyId: string): string {
  const parts = shopifyId.split('/');
  return parts[parts.length - 1];
}

/**
 * Calculates the discounted price based on the given discount value and type.
 *
 * @param {number} price - The original price of the product.
 * @param {number} discountValue - The value of the discount.
 * @param {'PERCENTAGE' | 'FIXED'} discountValueType - The type of the discount, either 'PERCENTAGE' or 'FIXED'.
 * @returns {number | null} - The discounted price, or null if the discount value is 0, undefined, or null.
 */
export function calculateDiscount(
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
