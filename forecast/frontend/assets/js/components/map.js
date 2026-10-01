/** True when a geometry has points on both sides of the antimeridian. */
const crossesAntimeridian = ({ coordinates }) => {
  let east = false;
  let west = false;

  const walk = (coords) => {
    if (typeof coords[0] === "number") {
      east ||= coords[0] > 150;
      west ||= coords[0] < -150;
      return;
    }
    coords.forEach(walk);
  };
  walk(coordinates);

  return east && west;
};

/** Move points east of the antimeridian west of -180 so the shape draws as one piece. */
const shiftAntimeridian = (geometry) => {
  const wrapPoint = (coord) => {
    let lng = coord[0];
    if (lng > 0) lng -= 360; // Shift Aleutians to -180...-190 range
    return [lng, coord[1]];
  };

  // Define the recursion to handle Polygon vs MultiPolygon coordinates
  const transformCoords = (coords) => {
    if (typeof coords[0] === "number") {
      return wrapPoint(coords);
    }
    return coords.map(transformCoords);
  };

  if (geometry.coordinates) {
    geometry.coordinates = transformCoords(geometry.coordinates);
  }
};

/** Move the Aleutians west of -180 so Alaska draws as one piece. */
export const shiftAleutians = (boundary, alerts = []) => {
  // Only a boundary straddling the antimeridian needs it, and its alerts ride along
  if (!boundary?.coordinates || !crossesAntimeridian(boundary)) {
    return;
  }

  // Process Boundary (it's a Geometry object)
  shiftAntimeridian(boundary);

  // Process Alerts
  alerts.forEach((alert) => {
    if (alert.geometry) {
      shiftAntimeridian(alert.geometry);
    }
  });
};

const ESRI_API_KEY =
  "AAPK1dd93729edc54e84ade1ea5dc0f4f9d3EPexfd5qirlO3QtHGBj5JQL7iUYHQOb4yLjfKEYFLcyN9PlMd87lMjjv8D3DxDsQ";

/** Hide the alert map and show the non-critical map error in its place. */
export const showMapError = (elementId) => {
  document
    .getElementById("wx-alert-map-error")
    .classList.remove("display-none");
  document
    .getElementById(elementId)
    .closest("wx-alert-map, wx-wfo-map").style.display = "none";
};

/** Put a Leaflet map on the Esri streets basemap. */
export const createBaseMap = (elementId, options) => {
  const L = window.L;
  const map = L.map(elementId, options).setView([0, 0], 0);

  // Leaflet is managed by a Ukrainian team. The default attribution they put on
  // maps includes a Ukrainian flag to show their national pride. But as an
  // official website of the US Government, that might not be appropriate for
  // us, so we remove the flag.
  map.attributionControl.setPrefix(
    "<a href='https://leafletjs.com' title='A JavaScript library for interactive maps'>Leaflet</a>",
  );

  // Add Esri Basemap
  L.esri.Vector.vectorBasemapLayer("arcgis/streets", {
    apiKey: ESRI_API_KEY,
  }).addTo(map);

  return map;
};
