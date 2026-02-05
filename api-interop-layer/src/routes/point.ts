import { getDataForPoint } from "../data/index.js";
import { getRadarMetadata } from "../data/radar.js";

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

export const handler = async (request: any) => {
  const { latitude, longitude } = request.params;
  const data = await getDataForPoint(latitude, longitude);

  // if we have a place, we can get radar even if we don't actually have point
  // forecast data.
  if (data.place) {
    (data as any).radarMetadata = await getRadarMetadata({
      place: data.place,
      point: { latitude, longitude },
    });
  }

  if (data.error) {
    return { data, status: data.status, error: data.error };
  }
  return { data };
};
