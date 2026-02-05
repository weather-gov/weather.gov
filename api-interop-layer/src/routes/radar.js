import { getRadarMetadata } from "../data/radar.js";
import { getClosestPlace } from "../data/points.js";

export const method = "GET";

export const url = "/radar/:latitude/:longitude";

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
  const place = await getClosestPlace(latitude, longitude);
  if (place == null) {
    return { data: { error: true } };
  }

  const point = { latitude, longitude };
  const radarMetadata = await getRadarMetadata({ place, point });

  return { data: { place, point, radarMetadata } };
};
