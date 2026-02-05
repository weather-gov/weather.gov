import { getCountyData } from "../data/county/index.js";

export const method = "GET";
export const url = "/county/:fips";
export const schema = {
  params: {
    type: "object",
    properties: {
      fips: {
        type: "string",
        pattern: "^[0-9]{5}$",
      },
    },
  },
};

export const handler = async (request: any) => {
  const { fips } = request.params;

  const county = await getCountyData(fips);
  if (county.error) {
    return {
      status: county.status ?? 500,
      data: { error: county.error },
      error: county.error,
    };
  }

  return { data: county };
};
