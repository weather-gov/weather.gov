/**
 * stateAlertMap.js
 * Logic for fetching state boundaries and alerts via Geobuf endpoints.
 */

let boundaryPromise = null;
let alertsPromise = null;

const stateDataFetch = (stateCode) => {
  boundaryPromise = fetch(`/wx/state/${stateCode}/`).then((res) =>
    res.arrayBuffer(),
  );
  alertsPromise = fetch(`/wx/state/${stateCode}/alerts`).then((res) =>
    res.arrayBuffer(),
  );
};

// Helper to decode Geobuf
const decodeGeobuf = (buffer) => {
  try {
    const pbf = new window.Pbf(buffer);
    return window.geobuf.decode(pbf);
  } catch (e) {
    console.error("Geobuf decoding failed", e);
    return null;
  }
};

const setupStateMap = async () => {
  // Get Metadata from the script tag we added to alerts.html
  const meta = JSON.parse(
    document.getElementById("state-metadata").textContent,
  );
  const loader = document.getElementById("wx_map_loader");
  if (!boundaryPromise) stateDataFetch(meta.stateCode);

  const L = window.L;
  const polylabel = window.polylabel;
  const stateAlertLayers = { 1: [], 2: [], 3: [], 4: [], 5: [], all: [] };
  let curDayIndex = "all";
  let stateOutline;
  let markers;

  const iconOffsets = [
    { x: 0, y: 0 },
    { x: 0, y: -34 },
    { x: 34, y: 0 },
    { x: 0, y: 34 },
    { x: -34, y: 0 },
  ];

  // Map Initialization
  const map = L.map("wx-state-alert-map", {
    zoomDelta: 1,
    zoomSnap: 0.5,
    maxZoom: 15,
    worldCopyJump: false,
  }).setView([0, 0], 0);

  /** Show alerts for the selected day or for "all". */
  const filterMap = () => {
    if (!markers) return;

    // If we aren't viewing "all", hide the "all" layers first
    if (curDayIndex !== "all") {
      stateAlertLayers["all"].forEach((layer) => {
        layer.setStyle({ fillOpacity: 0, opacity: 0 });
        if (layer.wx_marker) layer.wx_marker.remove();
      });
    }

    markers.clearLayers();
    const layersToDisplay = stateAlertLayers[curDayIndex] || [];
    layersToDisplay.forEach((layer) => {
      layer.resetStyle();
      if (layer.wx_marker) markers.addLayer(layer.wx_marker);
    });

    if (markers.getLayers().length > 0) {
      markers.refreshClusters();
    }
  };

  /** Handle when a day is selected via the tab component. */
  const handleDay = (e) => {
    curDayIndex = e.detail.dataset.alertDay;
    filterMap();
  };

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
    const geometry = feature.geometry;

    // If it's a Polygon, we wrap it in an array to treat it like a MultiPolygon with one item
    const polygonList =
      geometry.type === "MultiPolygon"
        ? geometry.coordinates
        : [geometry.coordinates];

    // Loop through list of polygons
    // When finding the center, return center
    for (let i = 0; i < polygonList.length; i++) {
      const polygonCoords = polygonList[i];

      // Get Center of polygon using polylabel (center of mass)
      const [lng, lat] = polylabel(polygonCoords, 0.000001);
      const labelCenter = L.latLng(lat, lng);

      // If the natural center of this polygon is visible, return
      if (map.getBounds().contains(labelCenter)) {
        return labelCenter;
      }

      // If natural center isn't visible, the polygon might still be partially on screen
      const outerRing = polygonCoords[0];
      const points = outerRing.map(([lng, lat]) => L.point([lat, lng]));

      // Clip polygon within viewport (`xybounds`)
      const clippedPoints = L.PolyUtil.clipPolygon(points, xybounds);

      if (clippedPoints.length > 0) {
        // Convert clipped xy points back to LatLngs for polygonCenter
        const clippedLatLngs = clippedPoints.map((p) => L.latLng([p.x, p.y]));
        try {
          return L.PolyUtil.polygonCenter(clippedLatLngs, map.options.crs);
        } catch (e) {
          // Fallback if polygonCenter fails on weird clipped shapes
          continue;
        }
      }
    }

    // If no part of any polygon is within the viewport
    return null;
  };

  // Leaflet is managed by a Ukrainian team. The default attribution they put on
  // maps includes a Ukrainian flag to show their national pride. But as an
  // official website of the US Government, that might not be appropriate for
  // us, so we remove the flag.
  map.attributionControl.setPrefix(
    "<a href='https://leafletjs.com' title='A JavaScript library for interactive maps'>Leaflet</a>",
  );

  // Add Esri Basemap
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

  /** HTML shown inside a popup when clicking on an alert icon on the map. */
  const getPopupHTML = (eventSlug, eventName, countiesCount, meta) => {
    const { trans } = meta;
    const container = document.createElement("div");
    container.classList.add("text-center");

    const label =
      countiesCount === 1
        ? meta.trans.subdivision_name
        : meta.trans.subdivision_name_plural;

    const buttonText = trans.see_list_pattern.replace(
      "{subdivision}",
      trans.subdivision_name_plural,
    );

    container.innerHTML = `
      <div class="font-body-xs margin-bottom-2px text-bold text-primary-darkest">
        ${gettext(eventName)}
      </div>
      <div class="font-body-xs margin-bottom-2px text-base-dark">
        ${countiesCount} ${label}
      </div>
      <div>
        <button class="usa-button usa-button--unstyled font-body-xs usa-link" type="button">
          ${buttonText}
        </button>
      </div>
    `;

    const btn = container.querySelector("button");
    btn.addEventListener("click", () => {
      const targetId = `id-${eventSlug}`;
      const element = document.getElementById(targetId);

      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.focus({ preventScroll: true });
      }
    });

    return container;
  };

  /** Marker Clusters for alert Icons **/
  markers = L.markerClusterGroup({
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

  /** Marker Cluster event functions  **/
  markers.on("spiderfied", function (e) {
    if (e.cluster._icon) {
      // When cluster is spiderfied, it needs to be invisible
      e.cluster._icon.style.opacity = "0";
      e.cluster._icon.style.pointerEvents = "none";
    }
  });

  markers.on("unspiderfied", function (e) {
    if (e.cluster._icon) {
      // When cluster is unspiderfied, it needs to be visible
      e.cluster._icon.style.opacity = "1";
      e.cluster._icon.style.pointerEvents = "auto";
    }
  });

  /** Restacks all active alert polygons reversed, based on their initial render index. */
  const restackAlerts = () => {
    const activeLayers = stateAlertLayers[curDayIndex];
    const sorted = [...activeLayers].sort(
      (a, b) => b.wx_render_index - a.wx_render_index,
    );

    sorted.forEach((layer) => {
      if (map.hasLayer(layer)) {
        layer.bringToFront();
      }
    });

    // Bring State to the front at the end
    stateOutline.bringToFront();
  };

  /** Redraw icons on zoom in or pan; reset them on zoom out. */
  const handleMotion = (e) => {
    // Reset style when moved
    stateAlertLayers[curDayIndex].forEach((layer) => {
      layer.resetStyle();
    });

    const zoomedOut =
      e.target.getZoom() <= map.wx_state_zoom &&
      map.wx_latest_zoom > map.wx_state_zoom;
    const zoomedIn =
      e.target.getZoom() > map.wx_state_zoom &&
      e.target.getZoom() !== map.wx_latest_zoom;
    const panned =
      (e.target.getCenter() !== map.wx_state_center) !== map.wx_latest_center;
    if (zoomedOut) {
      stateAlertLayers[curDayIndex].forEach((layer) => {
        // Use the original position saved during initialization
        if (layer.wx_marker && layer.wx_marker.wx_orig_pos) {
          layer.wx_marker.setLatLng(layer.wx_marker.wx_orig_pos);
        }
      });
    } else if (zoomedIn || panned) {
      stateAlertLayers[curDayIndex].forEach((layer) => {
        // Fix visible center can be null if the polygon isn't in viewport. if null, skip
        let center = visibleCenter(layer, getXYBounds());
        if (center && layer.wx_marker) {
          layer.wx_marker.setLatLng(center);
        }
      });
    }
    map.wx_latest_zoom = e.target.getZoom();

    // Only refresh if marker cluster is full
    if (markers && markers.getLayers().length > 0) {
      try {
        markers.refreshClusters();
      } catch (err) {
        console.warn("MarkerCluster refresh suppressed during motion:", err);
      }
    }
  };

  map.on("zoomend", handleMotion);
  map.on("moveend", handleMotion);

  // Styles and icons
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
    state: {
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

  // Fetch Data from internal endpoints
  try {
    // Wait for GIS layers
    const [boundaryBuf, alertsBuf] = await Promise.all([
      boundaryPromise,
      alertsPromise,
    ]);

    const boundaryData = decodeGeobuf(boundaryBuf);
    const alertsData = decodeGeobuf(alertsBuf);

    if (!boundaryData) throw new Error("Could not decode state boundary");

    if (meta.stateCode === "AK") {
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

      // Process Boundary (it's a Geometry object)
      if (boundaryData.coordinates) {
        boundaryData.coordinates = transformCoords(boundaryData.coordinates);
      }

      // Process Alerts (it's a FeatureCollection)
      if (alertsData && alertsData.features) {
        alertsData.features.forEach((feature) => {
          if (feature.geometry && feature.geometry.coordinates) {
            feature.geometry.coordinates = transformCoords(
              feature.geometry.coordinates,
            );
          }
        });
      }
    }

    // Render State Boundary
    stateOutline = L.geoJSON(boundaryData, {
      style: styles.state,
    });
    map.fitBounds(stateOutline.getBounds(), {
      padding: [15, 15],
    });
    map.wx_state_xybounds = getXYBounds();
    map.wx_state_zoom = map.wx_latest_zoom = map.getZoom();
    map.wx_state_center = map.wx_latest_center = map.getCenter();

    // List for storing alert labels
    const markerList = [];

    // Empty map { alertId: layer } for hovering over alert accordian
    const alertIdToLayer = {};

    // Highlight function for mouseover events
    const highlightAlert = (alertId) => {
      const layer = alertIdToLayer[alertId];
      if (!layer) return;

      const marker = layer.wx_marker;
      const alertType = marker.alert_type;

      // Update Marker icon and z-index
      marker.setIcon(getLargeIcon(alertType));
      if (marker._icon) {
        marker._icon.classList.add("alert-marker-mouseover");
      }
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
      const alertType = marker.alert_type;

      // Reset Marker
      marker.setIcon(icons[alertType]);
      if (marker._icon) {
        marker._icon.classList.remove("alert-marker-mouseover");
      }
      marker.setZIndexOffset(0);

      // Reset Visual Style
      layer.resetStyle();

      // Place layer back in it's original order
      restackAlerts();
    };

    // Loop through decoded FeatureCollection
    if (alertsData && alertsData.features) {
      for (let i = alertsData.features.length - 1; i >= 0; i--) {
        const feature = alertsData.features[i];
        const alertJSON = feature.properties.alertjson;

        // Extract metadata
        const alertType = alertJSON.metadata.level.text || "other";
        const alertId = alertJSON.hash;
        const alertDays = alertJSON.alertDays || [];
        const eventName = alertJSON.event;
        const eventSlug = eventName.toLowerCase().replace(/\s+/g, "-");
        const countiesCount = alertJSON.total_counties_display || 0;
        const layer = L.geoJSON(feature.geometry, {
          style: styles[alertType],
        }).addTo(map);
        alertIdToLayer[alertId] = layer;
        let alertCenter = visibleCenter(layer, map.wx_state_xybounds);

        // Store the render index for sorting during highlight events
        layer.wx_render_index = i;

        if (alertDays) {
          alertDays.forEach((dayNum) => {
            stateAlertLayers[dayNum].push(layer);
          });
        }
        stateAlertLayers["all"].push(layer);

        layer.wx_marker = L.marker(alertCenter, { icon: icons[alertType] });
        layer.wx_marker.alert_type = alertType;
        layer.wx_marker.bindPopup(
          getPopupHTML(eventSlug, eventName, countiesCount, meta),
          { autoPan: true },
        );
        layer.wx_marker.on("click", (e) => handleMarkerEvent(e, layer));
        layer.wx_marker.on("popupclose", (e) => handleMarkerEvent(e, layer));
        layer.wx_marker.on("mouseover", () => highlightAlert(alertId));
        layer.wx_marker.on("mouseout", () => unhighlightAlert(alertId));

        // Add marker to list
        markerList.push(layer.wx_marker);
      }
    }

    markers.addLayers(markerList);
    map.addLayer(markers);

    // day selection starts on "all", but the user might have changed it
    const selected = document.querySelector(
      "wx-tabs button[aria-selected='true']",
    );
    curDayIndex = selected.dataset.alertDay;

    stateOutline.addTo(map);
    filterMap();

    document.querySelectorAll("button[data-alert-day]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        curDayIndex = e.currentTarget.getAttribute("data-alert-day");
        filterMap();
      });
    });

    if (loader) {
      loader.classList.add("hidden");
      setTimeout(() => {
        loader.style.display = "none";
      }, 400);
    }
  } catch (err) {
    console.error("Error loading or decoding state map data:", err);

    if (loader) {
      const loaderText = loader.querySelector(".loader-text");
      const spinner = loader.querySelector(".loader-spinner");

      if (loaderText) {
        loaderText.textContent = meta.trans.map_failure;
        loaderText.classList.add("text-error");
      }

      if (spinner) {
        spinner.style.display = "none";
      }

      loader.classList.remove("hidden");
      loader.style.display = "flex";
      loader.style.opacity = "1";
    }
  }
};

const checkForLeaflet = () => {
  if (window.L && window.L.esri && window.L.esri.Vector) {
    setupStateMap();
  } else {
    // Poll for the scripts loaded via alerts.html
    document.addEventListener("DOMContentLoaded", checkForLeaflet);

    // Check for the data attributes usually found in weather/scripts/leaflet.html
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
