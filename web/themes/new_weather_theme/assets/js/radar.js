const setupRadar = () => {
  const container = document.querySelector("wx-radar");

  const lat = Number.parseFloat(container.getAttribute("lat"));
  const lon = Number.parseFloat(container.getAttribute("lon"));

  const point = [lon, lat];

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
        zoom: 9,
        center: point,
        location: point,
      },
      agenda: null,
      layers: {
        alerts: {
          filter: "hazards",
          opacity: 0.8,
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

  const go = () => {
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

  if (container.offsetParent) {
    go();
  } else {
    const observer = new IntersectionObserver(
      (entries, self) => {
        if (entries[0].isIntersecting) {
          go();
          self.disconnect();
        }
      },
      { root: document.body, rootMartin: "0px", threshold: 1 },
    );
    observer.observe(container);
  }
};

document.addEventListener("DOMContentLoaded", () => {
  if (window.cmiRadar) {
    setupRadar();
  }

  document.querySelector("[data-wx-radar-cmi]").addEventListener("load", () => {
    setupRadar();
  });
});
