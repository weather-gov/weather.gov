export const checkForLeaflet = (callback) => {
  if (window.L && window.L.esri && window.L.esri.Vector) {
    callback();
  } else {
    // DOMContentLoaded fires after every deferred script, the Leaflet plugins and geobuf included
    document.addEventListener("DOMContentLoaded", callback, { once: true });
  }
};
