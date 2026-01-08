// When simplifying geometries, the number of meters to
// simplify to. The database uses the Douglas-Peucker
// algorithm for simplification:
// https://en.wikipedia.org/wiki/Ramer%E2%80%93Douglas%E2%80%93Peucker_algorithm
export const SIMPLIFICATION_METERS = 200;

// Spatial projections that we use.
export const SPATIAL_PROJECTION = Object.freeze({
  WGS84: 4326, // Degrees lat/lon
  WEB_MERCATOR: 3857, // Global meter grid
});
