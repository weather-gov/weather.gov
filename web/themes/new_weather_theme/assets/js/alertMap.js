const setupMaps = () => {
  const L = window.L;

  const alerts = document.querySelectorAll("wx-alert-map");
  for (const alert of alerts) {
    const geometry = JSON.parse(
      decodeURIComponent(alert.getAttribute("data-geometry")),
    );
    const alertId = alert.getAttribute("data-alert-id");

    const lat = Number.parseFloat(alert.getAttribute("lat"));
    const lon = Number.parseFloat(alert.getAttribute("lon"));

    const map = L.map(`wx_alert_map_${alertId}`).setView([lat, lon], 8);

    // Leaflet is managed by a Ukrainian team. The default attribution they put on
    // maps includes a Ukrainian flag to show their national pride. But as an
    // official website of the US Government, that might not be appropriate for
    // us, so turn off the attribution. We're not likely to use Leaflet in the
    // end anyway, but if we do, we'll figure out how to put back attributions
    // without the flag then.
    map.attributionControl.setPrefix("");

    L.esri.Vector.vectorBasemapLayer("arcgis/streets", {
      apiKey:
        "AAPK1dd93729edc54e84ade1ea5dc0f4f9d3EPexfd5qirlO3QtHGBj5JQL7iUYHQOb4yLjfKEYFLcyN9PlMd87lMjjv8D3DxDsQ",
    }).addTo(map);

    L.geoJSON(geometry, { style: { color: "#F00", opacity: 0.6 } }).addTo(map);

    const locationIcon = L.divIcon({
      className: "weathergov-location-marker",
    });
    L.marker([lat, lon], { icon: locationIcon }).addTo(map);
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const currentTabSelected = document.querySelector("#alerts[data-selected]");

  if (currentTabSelected) {
    setupMaps();
  } else {
    document.addEventListener("wx:tab-switched", (event) => {
      if (event.detail.tabId === "alerts") {
        setupMaps();
      }
    });
  }
});
