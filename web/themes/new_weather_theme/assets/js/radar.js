/*
agenda: {
  id: 'national', 'weather', 'local' // sets the initial view, default undefined
  center: [lat, lon] // set the intitial center, default center of Conus
  location: [lat, lon] // set the initial selected location (only applies to weather view), default undefined
  layer: {radar product options by view} // the selected product, default to Super Resolution Base Reflectivity
  filter: 'WSR-88D', 'TDWR', undefined (all) // type of radar stations to display, default to undefined
  station: {any station id}, undefined // The selected station, default undefined
}
opacity: {
  local/national/local/localStations: 0 to 1 // opacity for each layer, not the if layer is visible (which is set by view)
}
menu: true/false // display the top-right menu, default true
shortFuseOnly: true/false // if only short-fused alerts (vs all hazards) should display (if visible), default false
animating: true/false // if radar should enable play-back, default false
basemap: 'standard', 'topographic', 'satallite', 'ocean', 'darkcanvas' // what basemap to display, default 'standard'
artcc/cwa/county/state/rfc: true/false // if overlay should display, default false
}
*/

const setupRadar = () => {

  // If radar has already been initialized on the container
  // element, return and do nothing else.
  const existingRadar = document.querySelector(".cmi-radar-container");
  if(existingRadar){
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
};

document.addEventListener("DOMContentLoaded", () => {
  document.addEventListener("wx:tab-switched", (event) => {
    if (window.cmiRadar && event.detail.tabId === "current") {
      setupRadar();
    } else if(event.detail.tabId === "current"){
      document.querySelector("[data-wx-radar-cmi]").addEventListener("load", () => {
        setupRadar();
      });
    }
  });
});
