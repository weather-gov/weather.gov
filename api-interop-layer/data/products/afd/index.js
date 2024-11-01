import { fetchAPIJson } from "../../../util/fetch.js";
import { createLogger } from "../../../util/monitoring/index.js";
import AFDParser from "./AFDParser.js";

const logger = createLogger("AFD");

export default async (id) => {
  return fetchAPIJson(`/products/${id}`)
        .then(afdData => {
          const parser = new AFDParser(afdData.productText);
          if(afdData.status && afdData.status !== 200){
            return afdData;
          }
          try {
            parser.parse();
            afdData.parsedProductText = parser.getStructureForTwig();
            return afdData;
          } catch(e) {
            logger.error(e);
            return afdData;
          }
        });
};
