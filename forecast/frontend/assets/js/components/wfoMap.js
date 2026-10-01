import { decodeGeobuf, fetchGeobuf } from "./geobuf.js";
import { createBaseMap, shiftAleutians, showMapError } from "./map.js";
import { checkForLeaflet } from "./util.js";

/**
 * wfoMap.js
 * Draws the coverage area of a weather forecast office on the office page.
 */

const MAP_ID = "wx-wfo-map";

const meta = JSON.parse(document.getElementById("wfo-metadata").textContent);

// Kick off at module load so the fetch overlaps the Leaflet script load
const shapeRequest = meta.isBinary ? fetchGeobuf(`/wx/cwa/${meta.wfo}/`) : null;

// Matches the styling of the images this map replaced
const STYLE = {
  fillColor: "#B4C1CD",
  color: "rgb(7,100,141)",
  opacity: 0.85,
  fillOpacity: 0.3,
};

/** Draw the CWA boundary, inline or from the pbf endpoint. */
const setupWFOMap = async () => {
  try {
    const shape = meta.isBinary
      ? decodeGeobuf(await shapeRequest)
      : JSON.parse(document.getElementById("wfo-shape").textContent);
    shiftAleutians(shape);

    const map = createBaseMap(MAP_ID);
    const boundary = window.L.geoJSON(shape, {
      style: STYLE,
      interactive: false,
    }).addTo(map);
    map.fitBounds(boundary.getBounds());
  } catch (error) {
    console.error("Error loading WFO map data:", error);
    showMapError(MAP_ID);
  }
};

checkForLeaflet(setupWFOMap);
