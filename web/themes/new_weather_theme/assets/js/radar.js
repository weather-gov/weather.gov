const toggleMapExpand = (() => {
  let expanded = false;

  const sprites = {
    false:
      "/themes/new_weather_theme/assets/images/uswds/sprite.svg#zoom_out_map",
    true: "/themes/new_weather_theme/assets/images/spritesheet.svg#wx_zoom-in-map",
  };

  return (event) => {
    const container = event.target.closest(".wx-radar-container");
    const svgUse = document.querySelector("button.wx-radar-expand svg use");

    expanded = !expanded;

    if (expanded) {
      container.classList.add("wx-radar-container__expanded");
    } else {
      container.classList.remove("wx-radar-container__expanded");
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

const setupRadar = () => {
  // If radar has already been initialized on the container
  // element, return and do nothing else.
  const existingRadar = document.querySelector(".cmi-radar-container");
  if (existingRadar) {
    return;
  }

  const container = document.querySelector("wx-radar");

  const lat = Number.parseFloat(container.getAttribute("lat"));
  const lon = Number.parseFloat(container.getAttribute("lon"));

  const point = [lon, lat];

  // no alerts;
  // different heights on different breakpoints
  // explore customizing the controls
  // for a11y, describe that it's a radar map and otherwise hide it

  const options = {
    settings: {
      menu: {
        open: true,
      },
      map: {
        base: "standard",
        overlays: {
          artcc: false,
          county: false,
          cwa: false,
          rfc: false,
          state: false,
        },
        animating: false,
        zoom: 8,
        center: point,
        location: point,
      },
      agenda: null,
      layers: {
        alerts: {
          filter: "hazards",
          opacity: 0,
        },
        local: {
          opacity: 0.6,
        },
        stations: {
          opacity: 0.8,
        },
        national: {
          opacity: 0.6,
        },
      },
    },
    urls: {
      alerts: "https://alerts-v2.weather.gov",
      api: "https://api.weather.gov",
      forecast: "https://forecast.weather.gov",
      gis: "https://opengeo.ncep.noaa.gov/geoserver",
    },
  };

  window.app = window.cmiRadar.createApp("#wx_radar_container", options);
  window.app.$store.dispatch("markLocation", point);

  [".cmi-radar-menu-container", ".cmi-radar-menu-agendas"].forEach(
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
};

document.addEventListener("DOMContentLoaded", () => {
  const scriptEl = document.querySelector("[data-wx-radar-cmi]");
  const currentTabSelected = document.querySelector("#current[data-selected]");
  // If the page loads with the current tab selected
  // then we try to load the radar.
  // If the page loads with some other tab selected,
  // than we bind a listener for the tab-switched event.
  if (currentTabSelected && window.cmiRadar) {
    setupRadar();
  } else if (currentTabSelected) {
    scriptEl.addEventListener("load", () => {
      setupRadar();
    });
  } else {
    document.addEventListener("wx:tab-switched", (event) => {
      if (window.cmiRadar && event.detail.tabId === "current") {
        setupRadar();
      } else if (event.detail.tabId === "current") {
        scriptEl.addEventListener("load", () => {
          setupRadar();
        });
      }
    });
  }
});
