export const checkForLeaflet = (callback) => {
  if (window.L && window.L.esri && window.L.esri.Vector) {
    callback();
  } else {
    // Poll for the scripts loaded via alerts.html
    document.addEventListener("DOMContentLoaded", callback);

    // Check for the data attributes usually found in weather/scripts/leaflet.html
    document
      .querySelector("[data-wx-leaflet]")
      ?.addEventListener("load", callback);
    document
      .querySelector("[data-wx-leaflet-esri]")
      ?.addEventListener("load", callback);
    document
      .querySelector("[data-wx-leaflet-esri-vector]")
      ?.addEventListener("load", callback);
  }
};
