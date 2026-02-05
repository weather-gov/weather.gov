/** Initialize county alert map after Leaflet has loaded. */
const setupMap = () => {
  const L = window.L;
  const polylabel = window.polylabel;
  const countyAlertLayers = { 1: [], 2: [], 3: [], 4: [], 5: [], all: [] };
  const iconOffsets = [
    { x: 0, y: 0 },
    { x: 0, y: -34 },
    { x: 34, y: 0 },
    { x: 0, y: 34 },
    { x: -34, y: 0 },
  ];
  let curDayIndex = "all";

  const json = JSON.parse(document.getElementById("county-data").textContent);
  const map = L.map(`wx_county_alert_map`, {
    zoomDelta: 1,
    zoomSnap: 0.5,
    maxZoom: 18,
  }).setView([0, 0], 0);

  /** Show alerts for the selected day or for "all". */
  const filterMap = () => {
    if (curDayIndex !== "all") {
      countyAlertLayers["all"].forEach((layer) => {
        try {
          layer.setStyle({
            fillOpacity: 0,
            opacity: 0,
          });
          layer.wx_marker.remove();
        } catch (error) {
          console.log(error);
        }
      });
    }
    // Remove existing markers
    markers.clearLayers();
    countyAlertLayers[curDayIndex].forEach((layer) => {
      try {
        layer.resetStyle();
        markers.addLayer(layer.wx_marker);
      } catch (error) {
        console.log(error);
      }
    });
    markers.refreshClusters();
  };

  /** Handle when a day is selected via the tab component. */
  const handleDay = (e) => {
    curDayIndex = e.detail.dataset.alertDay;
    filterMap();
  };

  /** A custom expand/shrink button for the map container. */
  L.Control.Expand = L.Control.extend({
    options: {
      position: "topright",
    },

    onAdd: function (map) {
      this.map = map;
      this.container = map.getContainer().parentElement;
      this.button = document.createElement("button");
      this.button.classList.add("wx-radar-expand", "padding-0", "margin-1");
      this.buttonSetToExpand();
      this.button.addEventListener("click", this._resize.bind(this));
      return this.button;
    },

    buttonSetToExpand: function () {
      this.button.innerHTML = `<svg role="img" class="width-full height-full"><use xlink:href="/public/images/uswds/sprite.svg#zoom_out_map"></use></svg>`;
      this.button.setAttribute("aria-label", "Expand the county alert map");
    },

    buttonSetToCollapse: function () {
      this.button.innerHTML = `<svg role="img" class="width-full height-full"><use xlink:href="/public/images/spritesheet.svg#wx_zoom-in-map"></use></svg>`;
      this.button.setAttribute("aria-label", "Collapse the county alert map");
    },

    _resize: function (event) {
      this.container.parentElement.classList.toggle("tablet:grid-col-7");
      this.container.classList.toggle(
        "wx-county-alert-map-container__expanded",
      );
      this.button.classList.toggle("wx-map-control__expanded");
      if (this.button.classList.contains("wx-map-control__expanded")) {
        this.buttonSetToCollapse();
      } else {
        this.buttonSetToExpand();
      }
      this.map.invalidateSize();
    },

    onRemove: function (map) {
      // noop
    },
  });
  const expandButton = new L.Control.Expand();
  expandButton.addTo(map);

  /** Convert a map's bounds in lat/lng to x/y. */
  const getXYBounds = () => {
    const latlngBounds = map.getBounds();
    const southeast = latlngBounds.getSouthEast();
    const northwest = latlngBounds.getNorthWest();
    return L.bounds(
      [northwest.lat, northwest.lng],
      [southeast.lat, southeast.lng],
    );
  };

  /** Determine the center of a layer, considering only points within the viewport. */
  const visibleCenter = (layer, xybounds) => {
    const feature = layer.getLayers()[0].feature;

    // MultiPolygon Logic
    if (feature.geometry.type === "MultiPolygon") {
      const [lng, lat] = polylabel(feature.geometry.coordinates[0], 0.000001);
      const labelCenter = L.latLng(lat, lng);
      if (map.getBounds().contains(labelCenter)) {
        return labelCenter;
      }
    }

    // Logic for Polygon objects
    const array = feature.geometry.coordinates[0];
    const coords = array.length > 2 ? array : array[0];
    const points = coords.map(([y, x]) => L.point([x, y]));
    const clippy = L.PolyUtil.clipPolygon(points, xybounds).map((p) =>
      L.latLng([p.x, p.y]),
    );

    // if `clippy` is null return null. `polygonCenter` will error if `clippy` is null
    if (clippy.length === 0) {
      return null;
    } else {
      return L.PolyUtil.polygonCenter(clippy, map.options.crs);
    }
  };

  /** Open the associated alert accordion and bring it into view. */
  const handlePopupClick = (e) => {
    const accordion = document.querySelector(
      `button[aria-controls='a${e.target.dataset.alert_id}']`,
    );
    accordion.focus();
    accordion.scrollIntoView({ behavior: "smooth" });
    if (accordion.getAttribute("aria-expanded", "") === "false")
      accordion.click();
  };

  /** Change the opacity of the selected alert. */
  const handleMarkerEvent = (e, layer) => {
    switch (e.type) {
      case "click":
        layer.setStyle(styles.active);
        break;
      case "popupclose":
      case "mouseout":
        layer.resetStyle();
        break;
      case "mouseover":
        layer.setStyle(styles.hover);
        break;
      default:
        break;
    }
  };

  /** Marker Clusters for alert Icons **/
  const markers = L.markerClusterGroup({
    showCoverageOnHover: false,

    // Cluster marker Icon rendering function, icon defaults to highest alert clustered
    iconCreateFunction: function (cluster) {
      const childMarkers = cluster.getAllChildMarkers();
      const priorities = ["other", "watch", "warning"];

      // Find the highest priority index
      let highestIndex = 0;
      for (let i = 0; i < childMarkers.length; i++) {
        const typeAttr = childMarkers[i].alert_type;
        const p = priorities.indexOf(typeAttr);
        if (p > highestIndex) highestIndex = p;
        if (highestIndex === 2) break;
      }

      const type = priorities[highestIndex] || "other";

      // Ensure the icon object actually exists
      const iconObj = icons[type] || icons["other"];
      if (!iconObj) {
        console.error("Critical: 'icons' object is missing keys for:", type);
        return new L.DivIcon({ html: "<div>!</div>" });
      }

      const iconUrl = iconObj.options.iconUrl;

      return L.divIcon({
        html: `
          <div class="alert-cluster-badge-container" title="${cluster.getChildCount()} ${type} alerts">
            <img src="${iconUrl}" class="alert-cluster-main-icon" alt="" />
            <div class="alert-cluster-badge alert-badge-${type}" aria-hidden="true">
              ${cluster.getChildCount()}
            </div>
          </div>
        `,
        className: "leaflet-cluster-icon",
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });
    },
  });

  /** Redraw icons on zoom in or pan; reset them on zoom out. */
  const handleMotion = (e) => {
    // Reset style when moved
    countyAlertLayers[curDayIndex].forEach((layer) => {
      layer.resetStyle();
    });

    const zoomedOut =
      e.target.getZoom() <= map.wx_county_zoom &&
      map.wx_latest_zoom > map.wx_county_zoom;
    const zoomedIn =
      e.target.getZoom() > map.wx_county_zoom &&
      e.target.getZoom() !== map.wx_latest_zoom;
    const panned =
      (e.target.getCenter() !== map.wx_county_center) !== map.wx_latest_center;
    if (zoomedOut) {
      countyAlertLayers[curDayIndex].forEach((layer) => {
        try {
          layer.wx_marker.setLatLng(layer.wx_marker.wx_orig_pos);
        } catch (error) {
          console.log(error);
        }
      });
    } else if (zoomedIn || panned) {
      countyAlertLayers[curDayIndex].forEach((layer) => {
        try {
          // Fix visible center can be null if the polygon isn't in viewport. if null, skip
          let center = visibleCenter(layer, getXYBounds());
          if (center) {
            layer.wx_marker.setLatLng(center);
          }
        } catch (error) {
          console.log(error);
        }
      });
    }
    map.wx_latest_zoom = e.target.getZoom();

    // Only refresh if marker cluster is full
    if (markers && markers.getLayers().length > 0) {
      markers.refreshClusters();
    }
  };
  map.on("zoomend", handleMotion);
  map.on("moveend", handleMotion);

  /** HTML shown inside a popup when clicking on an alert icon on the map. */
  const getPopupHTML = (alertId, alertName) => {
    const html = document.createElement("div");
    html.classList.add("text-center");
    html.innerHTML = `
      <div class="font-body-xs margin-bottom-2px">${gettext(alertName)}</div>
      <div>
        <button class="usa-button usa-button--unstyled font-body-xs" type="button">
          ${gettext("js.alerts.link.see-details.01")}
        </button>
      </div>
    `;
    const btn = html.querySelector("button");
    btn.addEventListener("click", handlePopupClick);
    btn.dataset.alert_id = alertId;
    return html;
  };

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

  const MapIcon = L.Icon.extend({
    options: {
      // className: 'my-div-icon',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -8],
    },
  });

  const icons = {
    warning: new MapIcon({
      iconUrl: "/public/images/weather/wx_alerticon_circle_warning.svg",
    }),
    watch: new MapIcon({
      iconUrl: "/public/images/weather/wx_alerticon_circle_watch.svg",
    }),
    other: new MapIcon({
      iconUrl: "/public/images/weather/wx_alerticon_circle_other.svg",
    }),
  };

  const getLargeIcon = (type) => {
    return new MapIcon({
      iconUrl: icons[type].options.iconUrl,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -10],
    });
  };

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
    active: {
      fillOpacity: 0.5,
    },
    hover: {
      fillOpacity: 0.7,
      opacity: 1.0,
      weight: 7,
    },
  };

  // zoom to the county outline (but do not draw it yet)
  const countyOutline = L.geoJSON(json.county.shape, { style: styles.county });
  map.fitBounds(countyOutline.getBounds(), { padding: [15, 15] });
  map.wx_county_xybounds = getXYBounds();
  map.wx_county_zoom = map.wx_latest_zoom = map.getZoom();
  map.wx_county_center = map.wx_latest_center = map.getCenter();

  const markerList = [];

  // create alert layers and sort them
  for (let i = json.alerts.items.length - 1; i >= 0; i--) {
    try {
      let {
        geometry,
        alertDays,
        metadata: {
          level: { text: alertType },
        },
      } = json.alerts.items[i];
      let { id: alertId, event: alertName } = json.alerts.items[i];

      let layer = L.geoJSON(geometry, { style: styles[alertType] }).addTo(map);
      let alertCenter = visibleCenter(layer, map.wx_county_xybounds);

      layer.wx_marker = L.marker(alertCenter, { icon: icons[alertType] });
      layer.wx_marker.alert_type = alertType;
      layer.wx_marker.bindPopup(getPopupHTML(alertId, alertName), {
        autoPan: false,
      });
      layer.wx_marker.wx_orig_pos = alertCenter;
      layer.wx_marker.on("click", (e) => handleMarkerEvent(e, layer));
      layer.wx_marker.on("popupclose", (e) => handleMarkerEvent(e, layer));

      layer.wx_marker.on("mouseover", (e) => {
        e.target.setIcon(getLargeIcon(alertType));
        e.target.originalZIndex = e.target.options.zIndexOffset || 0;
        e.target.setZIndexOffset(1000);

        const vectorLayer = layer.getLayers()[0];
        if (vectorLayer && vectorLayer.getElement) {
          const el = vectorLayer.getElement();
          // Bookmark the current stack position
          layer._originalNextSibling = el.nextSibling;
          layer.bringToFront();
        }

        handleMarkerEvent(e, layer);
      });
      layer.wx_marker.on("mouseout", (e) => {
        e.target.setIcon(icons[alertType]);
        e.target.setZIndexOffset(e.target.originalZIndex);

        const vectorLayer = layer.getLayers()[0];
        if (vectorLayer && vectorLayer.getElement) {
          const el = vectorLayer.getElement();
          const parent = el.parentNode;

          if (
            parent &&
            layer._originalNextSibling &&
            layer._originalNextSibling.parentNode === parent
          ) {
            parent.insertBefore(el, layer._originalNextSibling);
          } else if (parent && !layer._originalNextSibling) {
            // It was already the last child (on top), so leave it at the end
            parent.appendChild(el);
          }
        }

        handleMarkerEvent(e, layer);
      });

      // Add marker to list
      markerList.push(layer.wx_marker);

      alertDays.forEach((day) => {
        countyAlertLayers[day].push(layer);
      });
      countyAlertLayers["all"].push(layer);
    } catch (error) {
      console.log(error);
    }
  }

  // Add cluster markers
  markers.addLayers(markerList);
  map.addLayer(markers);

  // day selection starts on "all", but the user might have changed it
  const selected = document.querySelector(
    "wx-tabs button[aria-selected='true']",
  );
  curDayIndex = selected.dataset.alertDay;

  countyOutline.addTo(map);
  filterMap();

  // ready to handle day change events
  window.addEventListener("wx-tab-focused", handleDay);

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
      console.log(error);
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
