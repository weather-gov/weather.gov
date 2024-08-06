import path from "node:path";
import fs from "node:fs/promises";
import { globSync } from "glob";

const PRODUCT_TYPE_IN_PATH_RX = /\/products\/types\/([A-Za-z]+)(\/|\.json)/;
const PRODUCT_TYPE_LOCATION_RX =
  /\/products\/types\/[A-Za-z]+\/locations\/([A-Za-z]+)\.json/;
const PRODUCT_TYPE_ALL_RX = /\/products\/types\/[A-Za-z]+\.json/;
const PRODUCT_TYPE_INDIVIDUAL_RX = /\/products\/[^/]+\.json/;

const getProductFilePaths = (base, bundleName) => 
      globSync(path.join(base, bundleName, "products", "**", "*.json"));


const getProductTypeFromPath = (filePath) => {
  const match = filePath.match(PRODUCT_TYPE_IN_PATH_RX);
  if (!match) {
    return null;
  }

  return match[1];
};

const getProductTypeFromData = (data) => 
      data.productCode || "UNKNOWN";

const getWFOCodeFromPath = (filePath) => {
  const match = filePath.match(PRODUCT_TYPE_LOCATION_RX);
  if (!match) {
    return null;
  }

  return match[1];
};

const getProductLabel = (data, filePath, recordType) => {
  if (data["@bundle"]?.name) {
    return data["@bundle"].name;
  }
  const productType =
    getProductTypeFromPath(filePath) ?? getProductTypeFromData(data);
  const wfoCode = getWFOCodeFromPath(filePath);
  let size;
  if (recordType === "all" || recordType === "location") {
    size = data["@graph"].length;
  }
  if (recordType === "all") {
    return `List of most recent ${productType}s (sample of ${size})`;
  }
  if (recordType === "location") {
    return `List of most recent ${productType}s for office ${wfoCode} (sample of ${size})`;
  }

  return `${productType} for ${data.issuingOffice} issued at ${data.issuanceTime}`;
};

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

const getProductInfo = async (base, bundleName) => {
  const productFiles = getProductFilePaths(base, bundleName);
  return Promise.all(productFiles.map(getProductInfoForFilePath));
};

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
