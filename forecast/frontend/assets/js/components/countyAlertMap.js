/** Initialize county alert map after Leaflet has loaded. */
const setupMap = () => {
  const countyAlertLayers = { 1: [], 2: [], 3: [], 4: [], 5: [], all: [] };
  let curDayIndex = "all";

  /** Show alerts for the selected day or for "all". */
  const filterMap = () => {
    if (curDayIndex !== "all") {
      countyAlertLayers["all"].forEach((layer) =>
        layer.setStyle({
          fillOpacity: 0,
          opacity: 0,
        }),
      );
    }
    countyAlertLayers[curDayIndex].forEach((layer) => layer.resetStyle());
  };

  /** Handle when a day is selected via the tab component. */
  const handleDay = (e) => {
    curDayIndex = e.detail.dataset.alertDay;
    filterMap();
  };

  const json = JSON.parse(document.getElementById("county-data").textContent);
  const L = window.L;
  const map = L.map(`wx_county_alert_map`, { zoomSnap: 0.2 }).setView(
    [0, 0],
    0,
  );

  // add a custom expand/shrink button for the map container.
  L.Control.Expand = L.Control.extend({
    options: {
      position: "topright",
    },

    onAdd: function (map) {
      this.map = map;
      this.container = map.getContainer().parentElement;
      this.button = L.DomUtil.create("button", "wx-map-control");
      this.button.setAttribute("aria-label", "Expand the county alert map");
      L.DomEvent.on(this.button, "click", this._resize, this);
      return this.button;
    },

    _resize: function (event) {
      this.container.parentElement.classList.toggle("tablet:grid-col-7");
      this.container.classList.toggle(
        "wx-county-alert-map-container__expanded",
      );
      this.button.classList.toggle("wx-map-control__expanded");
      // update aria attributes depending on state
      if (this.button.classList.contains("wx-map-control__expanded")) {
        this.button.setAttribute("aria-label", "Collapse the county alert map");
      } else {
        this.button.setAttribute("aria-label", "Expand the county alert map");
      }
      this.map.invalidateSize();
    },

    onRemove: function (map) {
      // noop
    },
  });
  const expandButton = new L.Control.Expand();
  expandButton.addTo(map);

  // Leaflet is managed by a Ukrainian team. The default attribution they put on
  // maps includes a Ukrainian flag to show their national pride. But as an
  // official website of the US Government, that might not be appropriate for
  // us, so we remove the flag.
  map.attributionControl.setPrefix(
    "<a href='https://leafletjs.com' title='A JavaScript library for interactive maps'>Leaflet</a>",
  );

  const ESRI_API_KEY =
    "AAPK1dd93729edc54e84ade1ea5dc0f4f9d3EPexfd5qirlO3QtHGBj5JQL7iUYHQOb4yLjfKEYFLcyN9PlMd87lMjjv8D3DxDsQ";
  L.esri.Vector.vectorBasemapLayer("arcgis/streets", {
    apiKey: ESRI_API_KEY,
  }).addTo(map);

  const styles = {
    warning: {
      fillColor: "#D83933",
      color: "#FB5A47",
      opacity: 0.85,
      fillOpacity: 0.3,
    },
    watch: {
      fillColor: "#D2B93B",
      color: "#947100",
      opacity: 0.85,
      fillOpacity: 0.3,
    },
    other: {
      fillColor: "#B4C1CD",
      color: "#585E63",
      opacity: 0.85,
      fillOpacity: 0.3,
    },
    county: {
      color: "#074b69",
      opacity: 1,
      fillOpacity: 0,
    },
  };

  // create layers and sort them
  for (let i = json.alerts.items.length - 1; i >= 0; i--) {
    let {
      geometry,
      alertDays,
      metadata: {
        level: { text: alertType },
      },
    } = json.alerts.items[i];
    let layer;
    if (alertType === "warning") {
      layer = L.geoJSON(geometry, { style: styles.warning }).addTo(map);
    } else if (alertType === "watch") {
      layer = L.geoJSON(geometry, { style: styles.watch }).addTo(map);
    } else {
      layer = L.geoJSON(geometry, { style: styles.other }).addTo(map);
    }
    alertDays.forEach((day) => {
      countyAlertLayers[day].push(layer);
    });
    countyAlertLayers["all"].push(layer);
  }

  // ready to handle day change events
  window.addEventListener("wx-tab-focused", handleDay);

  // day selection starts on "all", but the user might have changed it
  const selected = document.querySelector(
    "wx-tabs button[aria-selected='true']",
  );
  curDayIndex = selected.dataset.alertDay;
  if (curDayIndex !== "all") filterMap();

  // add the county outline and zoom to it
  const layer = L.geoJSON(json.county.shape, { style: styles.county }).addTo(
    map,
  );
  map.fitBounds(layer.getBounds(), { padding: [0.4, 0.4] });

  // add the user's location if they've already agreed to share it
  (async () => {
    try {
      const result = await navigator.permissions.query({ name: "geolocation" });
      if (result.state === "granted") {
        navigator.geolocation.getCurrentPosition((position) => {
          const locationIcon = L.divIcon({
            className: "wx-location-marker",
          });
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          L.marker([lat, lon], {
            icon: locationIcon,
            interactive: false,
          }).addTo(map);
          // Hide the location marker from screen readers and remove it from the tab
          // order. It's not interactive, so there's no reason it should be focusable.
          const locationMarker = document.querySelector(
            ".leaflet-marker-icon.wx-location-marker",
          );
          locationMarker?.setAttribute("aria-hidden", "true");
          locationMarker?.setAttribute("tabindex", "-1");
        });
      }
    } catch (error) {
      /* do nothing */
    }
  })();
};

const checkForLeaflet = () => {
  // We load Leaflet globally because that's the only way the ESRI plugins work.
  // We need all three (Leaflet + ESRI plugins) to be loaded before we proceed.
  if (window.L && window.L.esri && window.L.esri.Vector) {
    setupMap();
  } else {
    // If addEventListener is called multiple times with identical arguments,
    // the listener will only be added the first time. So, it's safe to just
    // keep doing this until we're done.
    //
    // It's also possible that we got here before the DOM load event, in which
    // case the Leaflet, ESRI, and ESRI vector script tags may not even be
    // present yet. So... wait on that as well!
    document.addEventListener("DOMContentLoaded", checkForLeaflet);
    document
      .querySelector("[data-wx-leaflet]")
      ?.addEventListener("load", checkForLeaflet);
    document
      .querySelector("[data-wx-leaflet-esri]")
      ?.addEventListener("load", checkForLeaflet);
    document
      .querySelector("[data-wx-leaflet-esri-vector]")
      ?.addEventListener("load", checkForLeaflet);
  }
};

checkForLeaflet();
