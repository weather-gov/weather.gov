import {
  addZoomControls,
  createBaseMap,
  shiftAleutians,
  showMapError,
} from "./map.js";
import { checkForLeaflet } from "./util.js";

const MAP_ID = "wx_coastal_alert_map";

const setupCoastalMap = () => {
  try {
    const zoneShape = JSON.parse(
      document.getElementById("coastal-zone-shape").textContent,
    );
    shiftAleutians(zoneShape);

    const container = document.querySelector("wx-alert-map");
    const map = createBaseMap(MAP_ID, { zoomControl: false });
    addZoomControls(map, {
      zoomInTitle: container.dataset.zoomIn,
      zoomOutTitle: container.dataset.zoomOut,
    });

    const boundary = window.L.geoJSON(zoneShape, {
      style: {
        color: "#11181D",
        weight: 3,
        opacity: 1,
        fillColor: "#FFFFFF",
        fillOpacity: 0.3,
      },
    });
    const bounds = boundary.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [15, 15] });
    }
    boundary.addTo(map);
  } catch {
    showMapError(MAP_ID);
  }
};

checkForLeaflet(setupCoastalMap);
