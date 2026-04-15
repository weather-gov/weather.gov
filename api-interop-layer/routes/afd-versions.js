import getAFDVersions from "../data/products/afd/versions.js";

export const method = "GET";
export const url = "/products/afd/versions";
export const schema = {};

export const handler = async (request) => {
  const data = await getAFDVersions();

  if(data.error){
    return { data, error: data.detail, status: data.status };
  }

  return { data };
};
