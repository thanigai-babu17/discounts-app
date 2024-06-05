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
