const ESRI_API_KEY =
  "AAPK1dd93729edc54e84ade1ea5dc0f4f9d3EPexfd5qirlO3QtHGBj5JQL7iUYHQOb4yLjfKEYFLcyN9PlMd87lMjjv8D3DxDsQ";

const ICON_URLS = {
  warning: "/public/images/weather/wx_alerticon_circle_warning.svg",
  watch: "/public/images/weather/wx_alerticon_circle_watch.svg",
  other: "/public/images/weather/wx_alerticon_circle_other.svg",
};

const CLUSTER_PRIORITIES = ["other", "watch", "warning"];

const styles = {
  outline: {
    color: "#11181D",
    weight: 3,
    opacity: 1,
    fillOpacity: 0,
    dashArray: "1 4",
    lineCap: "round",
  },
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
  active: {
    fillOpacity: 0.5,
  },
  hover: {
    fillOpacity: 0.7,
    opacity: 1.0,
    weight: 7,
  },
};

/** Hide the alert map and show the non-critical map error in its place. */
export const showMapError = (elementId) => {
  document
    .getElementById("wx-alert-map-error")
    .classList.remove("display-none");
  document.getElementById(elementId).closest("wx-alert-map").style.display =
    "none";
};

/** Render an outline plus clustered, day-filtered alerts on the Esri basemap. */
export const createAlertMap = ({
  elementId,
  name,
  maxZoom,
  outline,
  alerts,
  autoPan,
  onExpandToggle,
}) => {
  const L = window.L;
  const polylabel = window.polylabel;
  const layersByDay = { 1: [], 2: [], 3: [], 4: [], 5: [], all: [] };
  let curDayIndex = "all";

  const activeLayers = () => layersByDay[curDayIndex] ?? [];

  const map = L.map(elementId, {
    zoomDelta: 1,
    zoomSnap: 0.5,
    maxZoom,
  }).setView([0, 0], 0);

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

  /** A custom expand/shrink button for the map container. */
  const ExpandControl = L.Control.extend({
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
      this.button.innerHTML = `<svg role="img" aria-hidden="true" class="width-full height-full"><use xlink:href="/public/images/uswds/sprite.svg#zoom_out_map"></use></svg>`;
      this.button.setAttribute("aria-label", `Expand the ${name} alert map`);
    },

    buttonSetToCollapse: function () {
      this.button.innerHTML = `<svg role="img" aria-hidden="true" class="width-full height-full"><use xlink:href="/public/images/spritesheet.svg#wx_zoom-in-map"></use></svg>`;
      this.button.setAttribute("aria-label", `Collapse the ${name} alert map`);
    },

    _resize: function () {
      onExpandToggle(this.container);
      this.button.classList.toggle("wx-map-control__expanded");
      if (this.button.classList.contains("wx-map-control__expanded")) {
        this.buttonSetToCollapse();
      } else {
        this.buttonSetToExpand();
      }

      // Critical for Leaflet to recalculate the canvas size
      this.map.invalidateSize();
    },

    onRemove: function () {
      // noop
    },
  });
  new ExpandControl().addTo(map);

  // Styles and icons
  const MapIcon = L.Icon.extend({
    options: {
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -8],
    },
  });

  const icons = {
    warning: new MapIcon({ iconUrl: ICON_URLS.warning }),
    watch: new MapIcon({ iconUrl: ICON_URLS.watch }),
    other: new MapIcon({ iconUrl: ICON_URLS.other }),
  };

  const getLargeIcon = (type) =>
    new MapIcon({
      iconUrl: ICON_URLS[type],
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -10],
    });

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
    const { geometry } = layer.getLayers()[0].feature;

    // If it's a Polygon, we wrap it in an array to treat it like a MultiPolygon with one item
    const polygonList =
      geometry.type === "MultiPolygon"
        ? geometry.coordinates
        : [geometry.coordinates];

    // Loop through list of polygons
    // When finding the center, return center
    for (const polygonCoords of polygonList) {
      // Get Center of polygon using polylabel (center of mass)
      const [lng, lat] = polylabel(polygonCoords, 0.000001);
      const labelCenter = L.latLng(lat, lng);

      // If the natural center of this polygon is visible, return
      if (map.getBounds().contains(labelCenter)) {
        return labelCenter;
      }

      // If natural center isn't visible, the polygon might still be partially on screen
      const points = polygonCoords[0].map(([lng, lat]) => L.point([lat, lng]));

      // Clip polygon within viewport (`xybounds`)
      const clippedPoints = L.PolyUtil.clipPolygon(points, xybounds);

      if (clippedPoints.length > 0) {
        // Convert clipped xy points back to LatLngs for polygonCenter
        const clippedLatLngs = clippedPoints.map((p) => L.latLng([p.x, p.y]));
        try {
          return L.PolyUtil.polygonCenter(clippedLatLngs, map.options.crs);
        } catch {
          // Fallback if polygonCenter fails on weird clipped shapes
        }
      }
    }

    // If no part of any polygon is within the viewport
    return null;
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
    iconCreateFunction: (cluster) => {
      const highest = Math.max(
        ...cluster
          .getAllChildMarkers()
          .map((marker) => CLUSTER_PRIORITIES.indexOf(marker.alert_type)),
      );
      const type = CLUSTER_PRIORITIES[highest] ?? "other";
      const count = cluster.getChildCount();

      return L.divIcon({
        html: `
          <div class="alert-cluster-badge-container" title="${count} ${type} alerts">
            <img src="${ICON_URLS[type]}" class="alert-cluster-main-icon" alt="" />
            <div class="alert-cluster-badge alert-badge-${type}" aria-hidden="true">
              ${count}
            </div>
          </div>
        `,
        className: "leaflet-cluster-icon",
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });
    },
  });

  /** Marker Cluster event functions  **/
  markers.on("spiderfied", (e) => {
    if (e.cluster._icon) {
      // When cluster is spiderfied, it needs to be invisible
      e.cluster._icon.style.opacity = "0";
      e.cluster._icon.style.pointerEvents = "none";
    }
  });

  markers.on("unspiderfied", (e) => {
    if (e.cluster._icon) {
      // When cluster is unspiderfied, it needs to be visible
      e.cluster._icon.style.opacity = "1";
      e.cluster._icon.style.pointerEvents = "auto";
    }
  });

  // zoom to the outline (but do not draw it yet)
  const outlineLayer = L.geoJSON(outline, { style: styles.outline });
  map.fitBounds(outlineLayer.getBounds(), { padding: [15, 15] });
  const outlineXYBounds = getXYBounds();
  const outlineZoom = map.getZoom();
  let latestZoom = outlineZoom;

  /** Restacks all active alert polygons reversed, based on their initial render index. */
  const restackAlerts = () => {
    [...activeLayers()]
      .sort((a, b) => b.wx_render_index - a.wx_render_index)
      .forEach((layer) => {
        if (map.hasLayer(layer)) {
          layer.bringToFront();
        }
      });

    // Bring the outline to the front at the end
    outlineLayer.bringToFront();
  };

  /** Redraw icons on zoom in or pan; reset them on zoom out. */
  const handleMotion = (e) => {
    // Reset style when moved
    activeLayers().forEach((layer) => layer.resetStyle());

    const zoom = e.target.getZoom();
    if (zoom <= outlineZoom && latestZoom > outlineZoom) {
      activeLayers().forEach((layer) => {
        layer.wx_marker.setLatLng(layer.wx_marker.wx_orig_pos);
      });
    } else {
      const xybounds = getXYBounds();
      activeLayers().forEach((layer) => {
        // Fix visible center can be null if the polygon isn't in viewport. if null, skip
        const center = visibleCenter(layer, xybounds);
        if (center) {
          layer.wx_marker.setLatLng(center);
        }
      });
    }
    latestZoom = zoom;

    // Only refresh if marker cluster is full
    if (markers.getLayers().length > 0) {
      try {
        markers.refreshClusters();
      } catch (err) {
        console.warn("MarkerCluster refresh suppressed during motion:", err);
      }
    }
  };

  map.on("zoomend", handleMotion);
  map.on("moveend", handleMotion);

  /** Show alerts for the selected day or for "all". */
  const filterMap = () => {
    // If we aren't viewing "all", hide the "all" layers first
    if (curDayIndex !== "all") {
      layersByDay.all.forEach((layer) => {
        layer.setStyle({ fillOpacity: 0, opacity: 0 });
        layer.wx_marker.remove();
      });
    }

    // Remove existing markers
    markers.clearLayers();
    activeLayers().forEach((layer) => {
      layer.resetStyle();
      markers.addLayer(layer.wx_marker);
    });

    if (markers.getLayers().length > 0) {
      markers.refreshClusters();
    }
  };

  // Empty map { alertId: layer } for hovering over alert accordian
  const alertIdToLayer = {};

  // Highlight function for mouseover events
  const highlightAlert = (alertId) => {
    const layer = alertIdToLayer[alertId];
    if (!layer) return;

    const marker = layer.wx_marker;

    // Update Marker icon and z-index
    marker.setIcon(getLargeIcon(marker.alert_type));
    marker._icon?.classList.add("alert-marker-mouseover");
    marker.setZIndexOffset(100000);
    layer.bringToFront();

    // Set hover style
    layer.setStyle(styles.hover);
  };

  // Highlight function for mouseout events
  const unhighlightAlert = (alertId) => {
    const layer = alertIdToLayer[alertId];
    if (!layer) return;

    const marker = layer.wx_marker;

    // Reset Marker
    marker.setIcon(icons[marker.alert_type]);
    marker._icon?.classList.remove("alert-marker-mouseover");
    marker.setZIndexOffset(0);

    // Reset Visual Style
    layer.resetStyle();

    // Place layer back in it's original order
    restackAlerts();
  };

  // List for storing alert labels
  const markerList = [];

  // create alert layers and sort them
  for (let i = alerts.length - 1; i >= 0; i--) {
    const { id, type, geometry, days, popup } = alerts[i];
    if (!geometry) continue;

    try {
      const layer = L.geoJSON(geometry, { style: styles[type] }).addTo(map);
      const center = visibleCenter(layer, outlineXYBounds);

      // Store the render index for sorting during highlight events
      layer.wx_render_index = i;

      layer.wx_marker = L.marker(center, { icon: icons[type] });
      layer.wx_marker.alert_type = type;
      layer.wx_marker.wx_orig_pos = center;
      layer.wx_marker.bindPopup(popup, { autoPan });
      layer.wx_marker.on("click", (e) => handleMarkerEvent(e, layer));
      layer.wx_marker.on("popupclose", (e) => handleMarkerEvent(e, layer));
      layer.wx_marker.on("mouseover", () => highlightAlert(id));
      layer.wx_marker.on("mouseout", () => unhighlightAlert(id));

      alertIdToLayer[id] = layer;

      // Add marker to list
      markerList.push(layer.wx_marker);

      days.forEach((day) => layersByDay[day]?.push(layer));
      layersByDay.all.push(layer);
    } catch (error) {
      console.error(`Could not draw alert ${id}`, error);
    }
  }

  // Add cluster markers
  markers.addLayers(markerList);
  map.addLayer(markers);

  // day selection starts on "all", but the user might have changed it
  const selected = document.querySelector(
    "wx-tabs button[aria-selected='true']",
  );
  curDayIndex = selected?.dataset.alertDay ?? "all";

  outlineLayer.addTo(map);
  filterMap();

  // ready to handle day change events, other wx-tabs on the page don't carry an alert day
  window.addEventListener("wx-tab-focused", (e) => {
    const day = e.detail.dataset.alertDay;
    if (day) {
      curDayIndex = day;
      filterMap();
    }
  });

  return { map, highlightAlert, unhighlightAlert };
};
