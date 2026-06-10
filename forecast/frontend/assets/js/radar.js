const toggleMapExpand = (() => {
  let expanded = false;

  const sprites = {
    false: "/public/images/uswds/sprite.svg#zoom_out_map",
    true: "/public/images/spritesheet.svg#wx_zoom-in-map",
  };

  return (event) => {
    const container = event.target.closest(".wx-radar-container");
    const wrapper = event.target.closest(".wx-radar-wrapper");
    const svgUse = document.querySelector("button.wx-radar-expand svg use");
    const isLargeMap = container.classList.contains("wx-large-map");

    expanded = !expanded;

    if (expanded) {
      container.classList.add("wx-radar-container__expanded");
    } else {
      container.classList.remove("wx-radar-container__expanded");
    }

    // on small maps, the expand button widens the map; on large maps,
    // (like state) the expand button changes the aspect ratio (via CSS)
    if (!isLargeMap) {
      if (expanded) {
        wrapper.classList.remove("desktop:grid-col-6");
        wrapper.classList.add("desktop:grid-col-12");
      } else {
        wrapper.classList.add("desktop:grid-col-6");
        wrapper.classList.remove("desktop:grid-col-12");
      }
    }

    const descriptors = Array.from(
      container.querySelectorAll(".wx-radar-expand__description"),
    );
    for (const descriptor of descriptors) {
      if (descriptor.classList.contains("display-none")) {
        descriptor.classList.remove("display-none");
      } else {
        descriptor.classList.add("display-none");
      }
    }

    svgUse.setAttribute("xlink:href", sprites[expanded]);

    // If an element changes size due toggling a CSS class, that does not
    // trigger a resize event. CMI is listening to resize events on the window,
    // so let's fire a resize event so the map will grow/shrink correctly.
    window.dispatchEvent(new Event("resize"));
  };
})();

const updateRadarTimestamps = async (container) => {
  const timezone = container.getAttribute("data-timezone") || "UTC";

  try {
    const response = await fetch(
      "https://opengeo.ncep.noaa.gov/geoserver/conus/conus_bref_qcd/ows?service=wms&version=1.1.1&request=GetCapabilities",
    );
    const text = await response.text();

    // It's XML. Yay. Anyway, all of the times are listed as a single long
    // string, separated by commas. The most recent is at the end. CMI only
    // uses 20 frames, so we extract the last 20 timestamps.
    const match = text.match(/<Extent name="time".*>(.+)<\/Extent>/);

    if (match) {
      const [, times] = match;
      const range = times.split(",").slice(-20);
      const start = new Date(range[0]);
      const end = new Date(range.pop());

      const formatOptions = {
        hour: "numeric",
        minute: "2-digit",
        timeZone: timezone,
        timeZoneName: "short",
      };

      const startFormatter = new Intl.DateTimeFormat("en-US", {
        ...formatOptions,
        weekday: "long",
      });
      const endFormatter = new Intl.DateTimeFormat("en-US", formatOptions);

      const label = document.getElementById("wx-radar-timestamp-label");
      if (label) {
        label.innerText = `${startFormatter.format(start)} - ${endFormatter.format(end)}`;
      }
    }
  } catch (e) {
    // Fail silently
  }
};

const setupRadar = () => {
  // If radar has already been initialized on the container
  // element, return and do nothing else.
  const existingRadar = document.querySelector(".cmi-radar-container");
  if (existingRadar) {
    return;
  }

  const container = document.querySelector("wx-radar");

  updateRadarTimestamps(container);

  const bookmark = {
    agenda: {
      id: "weather",
    },
    opacity: {
      alerts: 0,
    },
  };

  const bounds = container.getAttribute("bounds");
  if (bounds) {
    try {
      const boundingCoordinates = JSON.parse(bounds);
      bookmark.agenda = {
        custom: {
          id: "radar",
          layers: ["activearea", "national"],
          area: {
            fitMaxZoom: 20,
            fitPadding: [160, 160, 160, 160],
            polygon: boundingCoordinates,
            style: {
              stroke: { color: "transparent" },
              fill: { color: "transparent" },
            },
          },
        },
      };
    } catch (e) {
      console.error(`Could not parse bounds for radar geometry`);
      return;
    }
  } else {
    const lat = Number.parseFloat(container.getAttribute("lat"));
    const lon = Number.parseFloat(container.getAttribute("lon"));

    const point = [lon, lat];
    bookmark.agenda = {
      id: "weather",
      zoom: 7,
      center: point,
      location: point,
    };
  }

  const options = {
    settings: {
      bookmark: `v1_${btoa(JSON.stringify(bookmark))}`,
      quickset: null,
    },
    urls: {
      alerts: "https://alerts.weather.gov",
      api: "https://api.weather.gov",
      forecast: "https://forecast.weather.gov",
      gis: "https://opengeo.ncep.noaa.gov/geoserver",
    },
    // We'll explicitly set the ESRI key here, so it's easier to change if we
    // need to in the future. Rather than patching the CMI library, we can just
    // update this.
    esriKey:
      "AAPTxy8BH1VEsoebNVZXo8HurNPcJD0FIYgRqKcG6xxTBL9nh-VFBFPksbJUeCAaOBmIl7l_u3FU4qHnugzOvbnCvb7RMvR4FD_D4AhbAn2hMpcV-vKc8Oz6Kb0itTkdvSjaBCv5EHG20BLTk7jV0VSlPq_N9FhOT2bn2z510HsHPTf4N2TkszfZwmZgzRYHS06-OFp40ixlJ2vLLRK8a_L_ojVp3FXtRCXPNFWXFKQzYdiNzx12uaMvJ_riiEvC7vfrAT1_JWn0gzIT",
  };

  window.app = window.cmiRadar.createApp("#wx-radar-container", options);

  // update the radar external link.
  const link = document.querySelector("#radar-point-link");
  link.href = `https://radar.weather.gov/?settings=${options.settings.bookmark}`;

  [".cmi-radar-container .menu", ".cmi-radar-menu-agendas"].forEach(
    (selector) => {
      const element = document.querySelector(selector);
      if (element) {
        element.remove();
      }
    },
  );

  const expandButton = document.querySelector("button.wx-radar-expand");
  if (expandButton) {
    expandButton.addEventListener("click", toggleMapExpand);

    // The sticky top of the expand button should be the bottom of the tab list,
    // so query that and set the button's top accordingly. Do it this way rather
    // than hard-coding it so things will behave well later if the tab list
    // height changes.
    const tabList = document.querySelector(`div.tab-buttons[role="tablist"]`);
    if (tabList) {
      const buttonContainer = expandButton.parentElement;
      buttonContainer.style.top = `${tabList.offsetHeight}px`;
    }
  }

  window.addEventListener("wx-auto-update", (e) => {
    if (e?.detail?.target === "radar") {
      updateRadarTimestamps(container);
    }
  });
};

const scriptEl = document.querySelector("[data-wx-radar-cmi]");
const currentTabSelected = document.querySelector("#today[data-selected]");
const radarEnabled = document.querySelector("#radar-enable");

// If the page loads with the current tab selected
// then we try to load the radar.
// If the page loads with the radar-enable id, then
// we load the radar anyway since it is desired.
// If the page loads with some other tab selected,
// than we bind a listener for the tab-switched event.
if (currentTabSelected && window.cmiRadar) {
  setupRadar();
} else if (currentTabSelected || radarEnabled) {
  scriptEl.addEventListener("load", () => {
    setupRadar();
  });
} else {
  document.addEventListener("wx:tab-switched", (event) => {
    if (window.cmiRadar && event.detail.tabId === "today") {
      setupRadar();
    } else if (event.detail.tabId === "today") {
      scriptEl.addEventListener("load", () => {
        setupRadar();
      });
    }
  });
}
