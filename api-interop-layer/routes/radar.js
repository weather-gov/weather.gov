import { getRadarMetadata } from "../data/radar.js";
import getPoint from "../data/points.js";

export const method = "GET";

export const url = "/radar/:latitude/:longitude";

export const schema = {
  params: {
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
};

export const handler = async (request) => {
  const { latitude, longitude } = request.params;
  const data = await getPoint(latitude, longitude);
  if (data.error) {
    return { data, status: data.status, error: data.error };
  }

  const { place } = data;
  const point = { latitude, longitude };
  const radarMetadata = await getRadarMetadata({ place, point });

  return { data: { place, point, radarMetadata } };
};
