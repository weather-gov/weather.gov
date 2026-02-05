import { fetchAPIJson } from "../../util/fetch.js";
import { logger } from "../../util/monitoring/index.js";
import AFDParser from "./afd/AFDParser.js";

const productLogger = logger.child({ subsystem: "product" });

export default async (id: any) =>
  fetchAPIJson(`/products/${id}`).then((productData) => {
    // If we don't have a good status, simply return
    // the response from the API
    if (productData.status && productData.status !== 200) {
      return productData;
    }

    // For now, we only parse AFD text products
    if (productData.productCode === "AFD") {
      const parser = new AFDParser(productData.productText);
      try {
        parser.parse();
        productData.parsedProductText = parser.getStructureForTwig();
        return productData;
      } catch (e) {
        productLogger.error({ err: e });
        return productData;
      }
    }

    // Otherwise, simply return the original response from
    // the API. For now, this would be all non-AFD products.
    return productData;
  });
