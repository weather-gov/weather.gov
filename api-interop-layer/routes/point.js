import { getDataForPoint } from "../data/index.js";

export const method = "GET";

export const url = "/point/:latitude/:longitude";

export const schema = {
  params: {
    type: "object",
    properties: {
      latitude: {
        type: "number",
        minimum: -90,
        maximum: 90,
      },
      longitude: {
        type: "number",
        minimum: -180,
        maximum: 180,
      },
    },
  },
};

export const handler = async (request) => {
  const { latitude, longitude } = request.params;

  try {
    const data = await getDataForPoint(latitude, longitude);

    if (data.error) {
      return { data, status: data.status, error: data.error };
    }
    return { data };
  } catch (e) {
    if (e.cause?.statusCode === 403) {
      return { status: 429, error: e };
    }
    throw e;
  }
};
