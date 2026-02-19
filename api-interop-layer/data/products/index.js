import { requestJSONWithHeaders } from "../../util/request.js";
import { logger } from "../../util/monitoring/index.js";
import AFDParser from "./afd/AFDParser.js";
import { Pool } from "undici";
import { getFromRedis, saveToRedis, parseTTLFromHeaders } from "../../redis.js";

const BASE_URL = process.env.API_URL ?? "https://api.weather.gov";
const pool = new Pool(BASE_URL, { pipelining: 2, allowH2: true });

const productLogger = logger.child({ subsystem: "product" });


export default async (id) => {
  const productKey = `/products/${id}`;
  // Check the redis cache for any stored value.
  // Return that if we find it.
  const foundInCache = await getFromRedis(productKey);
  if(foundInCache){
    return foundInCache;
  }

  // Fetch from the API
  const [productData, cacheControl] = await requestJSONWithHeaders(pool, productKey);

  // For now, we only parse AFD text products
  if (productData.productCode === "AFD") {
    const parser = new AFDParser(productData.productText);
    try {
      parser.parse();
      productData.parsedProductText = parser.getStructureForTwig();
    } catch (e) {
      productLogger.error({ err: e });
      productData.error = e;

      // Return immediately, so that we don't
      // cache this error
      return productData;
    }
  }

  // Cache and return the result
  const ttl = parseTTLFromHeaders(cacheControl);
  await saveToRedis(productKey, productData, ttl);
  return productData;
};
