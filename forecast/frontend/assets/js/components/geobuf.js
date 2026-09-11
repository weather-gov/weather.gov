/** Fetch a Geobuf endpoint as an arraybuffer, rejecting on a non-2xx response. */
export const fetchGeobuf = (url) =>
  fetch(url).then((res) => {
    if (!res.ok) {
      throw new Error(`${url} responded with ${res.status}`);
    }
    return res.arrayBuffer();
  });

/** Decode a Geobuf arraybuffer back into GeoJSON. */
export const decodeGeobuf = (buffer) => {
  const geojson = window.geobuf.decode(new window.Pbf(buffer));
  // An empty FeatureCollection encodes without a feature_collection field and decodes to {}
  return geojson.type ? geojson : { type: "FeatureCollection", features: [] };
};
