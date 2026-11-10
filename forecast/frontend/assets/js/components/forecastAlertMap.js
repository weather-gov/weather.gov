import { addZoomControls, createBaseMap } from "./map.js";
import { checkForLeaflet } from "./util.js";

const setupMap = (alert) => {
  const L = window.L;

  const geoJSON = JSON.parse(decodeURIComponent(alert.dataset.geoJson));
  const alertId = alert.dataset.alertId;
  const zoomInTitle = alert.dataset.zoomIn;
  const zoomOutTitle = alert.dataset.zoomOut;

  const lat = Number.parseFloat(alert.dataset.lat);
  const lon = Number.parseFloat(alert.dataset.lon);

  const map = createBaseMap(`wx_alert_map_${alertId}`, { zoomControl: false });

  map.setView([lat, lon], 8);

  addZoomControls(map, {
    zoomOutTitle: zoomOutTitle,
    zoomInTitle: zoomInTitle,
  });

  const alertType = alert.dataset.alertName.split(" ").pop();
  if (alertType === "Warning") {
    L.geoJSON(geoJSON, {
      style: {
        fillColor: "#D83933",
        color: "#FB5A47",
        opacity: 0.85,
        fillOpacity: 0.3,
      },
    }).addTo(map);
  } else if (alertType === "Watch") {
    L.geoJSON(geoJSON, {
      style: {
        fillColor: "#D2B93B",
        color: "#947100",
        opacity: 0.85,
        fillOpacity: 0.3,
      },
    }).addTo(map);
  } else {
    L.geoJSON(geoJSON, {
      style: {
        fillColor: "#B4C1CD",
        color: "#585E63",
        opacity: 0.85,
        fillOpacity: 0.3,
      },
    }).addTo(map);
  }

  const locationIcon = L.divIcon({
    className: "wx-location-marker",
  });
  L.marker([lat, lon], { icon: locationIcon, interactive: false }).addTo(map);

  // Hide the location marker from screen readers and remove it from the tab
  // order. It's not interactive, so there's no reason it should be focusable.
  const locationMarker = document.querySelector(
    `#wx_alert_map_${alertId} .wx-location-marker`,
  );
  if (locationMarker) {
    locationMarker.setAttribute("aria-hidden", "true");
    locationMarker.setAttribute("tabindex", "-1");
  }
};

const waitForAlertAccordions = () => {
  const alerts = document.querySelectorAll("wx-alert-map");

  for (const alert of alerts) {
    // We only want to show an alert map if the alert's accordion is open. If it
    // is currently closed, we'll wait for it to open and then display it. We
    // will only do this the first time the accordion is opened, so we don't
    // have to worry about maps being added multiple times.

    // Traverse up the DOM tree to the nearest node that matches this selector.
    // This is our container.
    const parent = alert.closest("wx-alerts > div");
    const button = parent.querySelector("button");
    const expanded = button.getAttribute("aria-expanded") === "true";

    if (expanded) {
      setupMap(alert);
    } else {
      // If we're not currently expanded, setup a mutation observer. Since we
      // don't wrap the accordions, we
      const mutationObserver = new MutationObserver((_, observer) => {
        const expandedNow =
          alert
            .closest("wx-alerts > div")
            .querySelector("button")
            .getAttribute("aria-expanded") === "true";

        if (expandedNow) {
          setupMap(alert);
          observer.disconnect();
        }
      });
      mutationObserver.observe(button, { attributes: true });
    }
  }
};

const waitForAlertTab = () => {
  // We also don't want to load any alert maps until the alerts tab is selected.
  // If it is, then we just need to wait for individual alert accordions to
  // open. Otherwise, we can listen for the tab-switched event.
  const currentTabSelected = document.querySelector("#alerts[data-selected]");

  if (currentTabSelected) {
    waitForAlertAccordions();
  } else {
    document.addEventListener("wx:tab-switched", (event) => {
      if (event.detail.tabId === "alerts") {
        waitForAlertAccordions();
      }
    });
  }
};

checkForLeaflet(waitForAlertAccordions);
