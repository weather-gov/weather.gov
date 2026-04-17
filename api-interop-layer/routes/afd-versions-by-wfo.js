import { byWFO } from "../data/products/afd/versions.js";

export const method = "GET";
export const url = "/products/afd/versions/:wfo";
export const schema = {
  params: {
    type: "object",
    properties: {
      wfo: {
        type: "string"
      }
    }
  }
};

export const handler = async (request) => {
  const wfo = request.params.wfo;

  const data = await byWFO(wfo);

  if(data.error){
    return { data, error: data.detail, status: data.status };
  }

  return { data };
};
