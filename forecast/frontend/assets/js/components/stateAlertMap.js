import { createAlertMap } from "./alertMap.js";
import { decodeGeobuf, fetchGeobuf } from "./geobuf.js";
import { showMapError } from "./map.js";
import { checkForLeaflet } from "./util.js";

/**
 * stateAlertMap.js
 * Logic for fetching state boundaries and alerts via Geobuf endpoints.
 */

const MAP_ID = "wx-state-alert-map";

// Get Metadata from the script tag we added to alerts.html
const meta = JSON.parse(document.getElementById("state-metadata").textContent);

// Kick off at module load so the fetches overlap the Leaflet script load
const geobufRequests = Promise.all([
  fetchGeobuf(`/wx/state/${meta.stateCode}/`),
  fetchGeobuf(`/wx/state/${meta.stateCode}/alerts`),
]);

/** HTML shown inside a popup when clicking on an alert icon on the map. */
const getPopupHTML = (eventSlug, eventName, countiesCount) => {
  const { trans } = meta;
  const container = document.createElement("div");
  container.classList.add("text-center");

  const label =
    countiesCount === 1
      ? trans.subdivision_name
      : trans.subdivision_name_plural;

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

const setupStateMap = async () => {
  const loader = document.getElementById("wx_map_loader");

  // Fetch Data from internal endpoints
  try {
    // Wait for GIS layers
    const [boundaryBuf, alertsBuf] = await geobufRequests;
    const boundary = decodeGeobuf(boundaryBuf);
    const alerts = decodeGeobuf(alertsBuf);

    createAlertMap({
      elementId: MAP_ID,
      name: "state",
      maxZoom: 15,
      outline: boundary,
      autoPan: true,
      onExpandToggle: (container) => {
        container.classList.toggle("wx-state-alert-map-container__expanded");
      },
      // Extract metadata from the decoded FeatureCollection
      alerts: alerts.features.map(({ geometry, properties }) => ({
        id: properties.hash,
        type: properties.metadata.level.text || "other",
        geometry,
        days: properties.alertDays || [],
        popup: getPopupHTML(
          properties.event.toLowerCase().replace(/\s+/g, "-"),
          properties.event,
          properties.total_counties_display || 0,
        ),
      })),
    });

    // un-hide the day tabs now that everything is loaded
    document.getElementById("state-alerts").classList.remove("display-none");

    if (loader) {
      loader.classList.add("hidden");
      setTimeout(() => {
        loader.style.display = "none";
      }, 400);
    }
  } catch (err) {
    console.error("Error loading or decoding state map data:", err);

    // Show error message to user and hide the map container
    showMapError(MAP_ID);
  }
};

checkForLeaflet(setupStateMap);
