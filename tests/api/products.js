import path from "node:path";
import fs from "node:fs/promises";
import { globSync } from "glob";

/**
 * Note on Product Types and Paths
 * There are two kinds of paths for potential product
 * types.
 * The first is `/products/types/<type>.json`, which
 * will currently pull (up to) the 5k most recent products
 * of that type, no matter where they were issued.
 * The second kind of product path starts with
 * `/products/types/<type>/`, and can be further specified
 * to get products for a specific WFO, for example,
 * `/products/types/AFD/locations/OKX.json
 */
const PRODUCT_TYPE_IN_PATH_RX = /\/products\/types\/([A-Za-z]+)(\/|\.json)/;
const PRODUCT_TYPE_LOCATION_RX =
  /\/products\/types\/[A-Za-z]+\/locations\/([A-Za-z]+)\.json/;
const PRODUCT_TYPE_ALL_RX = /\/products\/types\/[A-Za-z]+\.json/;
const PRODUCT_TYPE_INDIVIDUAL_RX = /\/products\/[^/]+\.json/;

/**
 * @param {string} base - The base dir for bundles
 * @param {string} bundleName - The name of the bundle
 * @returns {string[]} - An array of full file paths for any matching
 *            JSON files under the products for the given bundle
 */
const getProductFilePaths = (base, bundleName) => 
      globSync(path.join(base, bundleName, "products", "**", "*.json"));

/**
 * Attempts to extract the product code from the path
 * @param {string} filePath - The path to the given JSON file
 * @returns {string?} - The extracted product type code or null
 */
const getProductTypeFromPath = (filePath) => {
  const match = filePath.match(PRODUCT_TYPE_IN_PATH_RX);
  if (!match) {
    return null;
  }

  return match[1];
};

/**
 * Attempts to extract the product code from
 * the parsed JSON data object for this product.
 * @param {object} data - The parsed JSON object for this
 * individual product
 * @returns {string} - The extracted product code or UNKNOWN
 */
const getProductTypeFromData = (data) => 
      data.productCode || "UNKNOWN";

/**
 * Attempts to extract a WFO code from the filePath
 * @param {string} filePath - A path to a JSON file
 * @returns {string?} - The extracted WFO code, if found,
 * or null otherwise
 */
const getWFOCodeFromPath = (filePath) => {
  const match = filePath.match(PRODUCT_TYPE_LOCATION_RX);
  if (!match) {
    return null;
  }

  return match[1];
};

/**
 * Composes a label for the bundled product file that
 * will be used for displaying information about the bundler
 * in its UI.
 * @param {object} data - The parsed JSON data object
 * @param {string} filePath - The path to the source JSON file
 * @param {string} recordType - 'individual', 'all', or 'location'
 * @returns {string} - A label that describes this data file for the
 * bundler UI
 */
const getProductLabel = (data, filePath, recordType) => {
  if (data["@bundle"]?.name) {
    return data["@bundle"].name;
  }
  const productType =
    getProductTypeFromPath(filePath) ?? getProductTypeFromData(data);
  const wfoCode = getWFOCodeFromPath(filePath);
  if (recordType === "all") {
    const size = data["@graph"].length;
    return `List of most recent ${productType}s (sample of ${size})`;
  }
  if (recordType === "location") {
    const size = data["@graph"].length;
    return `List of most recent ${productType}s for office ${wfoCode} (sample of ${size})`;
  }
}

  return `${productType} for ${data.issuingOffice} issued at ${data.issuanceTime}`;
};

/**
 * Attempts to get a URL to a representation of the file
 * in our Drupal application.
 * Note that not all files will have a 1:1 representation
 * when it comes to products (like lists of available product IDs)
 * @param {object} data - The parsed JSON data object
 * @param {string} filePath - The path to the source JSON file
 * @param {string} recordType - 'individual', 'all', or 'location'
 * @returns {string?} - A url or null
 */
const getProductHref = (data, filePath, recordType) => {
  const productType = getProductTypeFromPath(filePath);
  const wfoCode = getWFOCodeFromPath(filePath);
  const base = "http://localhost:8080";
  if (recordType === "individual") {
    return null; // For now, we have no way to display individual AFDs by id
  }
  if (recordType === "all") {
    return `${base}/${productType.toLowerCase()}`;
  }
  return `${base}/${productType.toLowerCase()}?wfo=${wfoCode}`;
};

/**
 * Given a filePath to a product JSON object file, will
 * format and return a JS object with information that we
 * care about, including info for display in the bundler UI
 * @param {string} filePath - The path to the JSON file
 * @returns {object} - Information about the referenced file
 */
const getProductInfoForFilePath = async (filePath) => {
  const productType = getProductTypeFromPath(filePath) ?? "UNKNOWN";
  const wfoCode = getWFOCodeFromPath(filePath);
  let recordType;
  if (filePath.match(PRODUCT_TYPE_INDIVIDUAL_RX)) {
    recordType = "individual";
  } else if (filePath.match(PRODUCT_TYPE_ALL_RX)) {
    recordType = "all";
  } else if (filePath.match(PRODUCT_TYPE_LOCATION_RX)) {
    recordType = "location";
  }

  const data = JSON.parse(await fs.readFile(filePath));
  const label = getProductLabel(data, filePath, recordType);
  const url = getProductHref(data, filePath, recordType);

  return { label, url, data, type: productType, recordType, wfo: wfoCode };
};

/**
 * Gets product info objects for all product files in
 * the referenced bundle
 * @param {string} base - The base dir for bundles
 * @param {string} bundleName - The name of the bundle
 * @returns {object[]} - An array of info objects
 */
const getProductInfo = async (base, bundleName) => {
  const productFiles = getProductFilePaths(base, bundleName);
  return Promise.all(productFiles.map(getProductInfoForFilePath));
};

/**
 * Given a base location and bundle name, will append
 * lines of markup concerning any products (if present)
 * to the given list of lines.
 * Modifies the list in place, but also returns the list.
 * @param {string} base - The base dir for bundles
 * @param {string} bundleName - The name of the bundle
 * @param {string[]} lines - An array of markup lines that will
 * be appended to if needed
 */
const getProductUI = async (base, bundleName, lines = []) => {
  const productInfo = await getProductInfo(base, bundleName);
  if (!productInfo.length) {
    return lines;
  }
  lines.push(`<br/><br/>Products in the bundle:`);
  lines.push("<ul>");
  productInfo.forEach((product) => {
    if (product.url) {
      lines.push(`<li><a href="${product.url}">${product.label}</a></li>`);
    } else {
      lines.push(`<li>${product.label} (no linked page yet)</li>`);
    }
  });
  lines.push("</ul>");
  return lines;
};

export { getProductUI as ui, getProductInfo as info };
