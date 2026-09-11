import { createAlertMap, showMapError } from "./alertMap.js";
import { decodeGeobuf, fetchGeobuf } from "./geobuf.js";
import { checkForLeaflet } from "./util.js";

const MAP_ID = "wx_county_alert_map";

const meta = JSON.parse(document.getElementById("county-metadata").textContent);

// Kick off at module load so the fetches overlap the Leaflet script load
const geobufRequests = meta.isBinary
  ? Promise.all([
      fetchGeobuf(`/wx/county/${meta.countyFips}/`),
      fetchGeobuf(`/wx/county/${meta.countyFips}/alerts`),
    ])
  : null;

/** Put the geometry the view stripped back where the page data expects it. */
const hydrateGeometry = async (json) => {
  const [boundaryBuf, alertsBuf] = await geobufRequests;
  json.county.shape = decodeGeobuf(boundaryBuf);

  const geometries = new Map(
    decodeGeobuf(alertsBuf).features.map((feature) => [
      feature.properties.id,
      feature.geometry,
    ]),
  );
  json.alerts.items.forEach((item) => {
    item.geometry = geometries.get(item.id) ?? item.geometry;
  });
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

/** Add the user's location if they've already agreed to share it. */
const showUserLocation = async (map) => {
  try {
    const result = await navigator.permissions.query({ name: "geolocation" });
    if (result.state === "granted") {
      navigator.geolocation.getCurrentPosition((position) => {
        const locationIcon = window.L.divIcon({
          className: "wx-location-marker",
        });
        window.L.marker([position.coords.latitude, position.coords.longitude], {
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
};

/** Initialize county alert map after Leaflet has loaded. */
const setupMap = async () => {
  try {
    const json = JSON.parse(document.getElementById("county-data").textContent);
    if (meta.isBinary) {
      await hydrateGeometry(json);
    }

    const { map, highlightAlert, unhighlightAlert } = createAlertMap({
      elementId: MAP_ID,
      name: "county",
      maxZoom: 18,
      outline: json.county.shape,
      autoPan: false,
      onExpandToggle: (container) => {
        container.parentElement.classList.toggle("tablet:grid-col-7");
        container.classList.toggle("wx-county-alert-map-container__expanded");
      },
      alerts: json.alerts.items.map((item) => ({
        id: item.unique_id,
        type: item.metadata.level.text,
        geometry: item.geometry,
        days: item.alertDays,
        popup: getPopupHTML(item.unique_id, item.event),
      })),
    });

    // Hover alert accordion logic
    document.querySelectorAll(".usa-accordion").forEach((item) => {
      const alertId = item.id.replace("alert_", "");
      item.addEventListener("mouseover", () => highlightAlert(alertId));
      item.addEventListener("mouseout", () => unhighlightAlert(alertId));
    });

    showUserLocation(map);
  } catch (error) {
    console.error("Error loading county map data:", error);
    showMapError(MAP_ID);
  }
};

checkForLeaflet(setupMap);
