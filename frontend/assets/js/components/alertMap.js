const setupMap = (alert) => {
  const L = window.L;

  const geoJSON = JSON.parse(decodeURIComponent(alert.dataset.geoJson));
  const alertId = alert.dataset.alertId;

  const lat = Number.parseFloat(alert.dataset.lat);
  const lon = Number.parseFloat(alert.dataset.lon);

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

const checkForLeaflet = () => {
  // We load Leaflet globally because that's the only way the ESRI plugins work.
  // We need all three (Leaflet + ESRI plugins) to be loaded before we proceed.
  if (window.L && window.L.esri && window.L.esri.Vector) {
    waitForAlertTab();
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
