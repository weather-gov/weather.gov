import fetchData from "./fetchData.js";

const fetchCircleIcon = async () => {
  const response = await fetch("/Circle.svg");
  const markup = await response.text();
  return markup;
};

const genericAlertStyle = {
  weight: 1,
  fillColor: "transparent"
};

const init = async () => {

  // Setup the initial map and view
  const map = L.map("leaflet-map").setView([39.8283, -98.5795], 3);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);

  // Set up an initial feature group.
  // We use this because it's the only way
  // to get the bounds (extent) of a given
  // layer, which is needed to zoom in on a
  // particular feature.
  const alertFeatureGroup = L.featureGroup();
  alertFeatureGroup.on("click", e => {
    map.fitBounds(e.target.getBounds());
  });


  // Load the alert, get the GeoJSON,
  // and draw the feature to the map as a layer.
  const alert = await fetchData();
  const alertLayer = L.geoJSON().addTo(map);
  alertLayer.addData(alert.geometry);
  alertLayer.setStyle(genericAlertStyle);
  alertFeatureGroup.addLayer(alertLayer);

  // Fetch the icon for the alert and display it
  // as an SVG overlay layer on the map.
  const iconEl = await fetchCircleIcon();
  const icon = L.icon({
    iconUrl: "Circle.svg"
  });
  // We have to reverse the order from lon/lat to lat/lon
  // in leaflet when parsing out geometries manually!
  const alertIconCoords = [
    alert.centroid.geometry.coordinates[1],
    alert.centroid.geometry.coordinates[0]
  ];
  const alertIconMarker = L.marker(alertIconCoords, {icon}).addTo(map);
  const alertIconTooltip = L.tooltip(
    alertIconMarker.getLatLng(),
    {content: alert.event}
  );

  // Add a hover state to the alert layer
  alertLayer.on("mouseover", (e) => {
    e.target._cachedStyle = genericAlertStyle;
    e.target.setStyle({
      fillColor: "white",
      weight: 2
    });
  });
  alertLayer.on("mouseout", (e) => {
    e.target.setStyle(genericAlertStyle);
  });

  // Add click event to the Icon, activating
  // the tooltip
  alertIconMarker.on("click", e => {
    alertIconTooltip.addTo(map);
  });
};

document.addEventListener('DOMContentLoaded', () => {
  init();
});
