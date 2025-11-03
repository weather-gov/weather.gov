const mapUtil = (() => {
  const layers = [];

  return {
    addLayers: async (path, map, { modify = false } = {}) => {
      const geojson = await fetch(path).then((r) => r.json());

      geojson.forEach((feature) => {
        const layer = L.geoJSON(feature, {
          style: () => ({ color: "red", fillColor: "red" }),
        }).addTo(map);
        if (modify) {
          modify(layer, feature);
        }
        layers.push(layer);
      });

      return layers;
    },

    clearLayers: () => {
      layers.forEach((layer) => layer.remove());
      layers.length = 0;
    },
  };
})();

const setLayer = (path, map) => {
  mapUtil.clearLayers();

  return mapUtil.addLayers(path, map, {
    modify: (layer, feature) => {
      layer.bindTooltip(feature.properties.id.split("/").pop(), {
        direction: "center",
      });
    },
  });
};

const main = async () => {
  var map = L.map("map").setView([44.9672408333, -103.7715563333], 4);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  await setLayer("./data/wfos.geojson", map);

  const buttons = Array.from(
    document.querySelectorAll("#switcher button[data-layer]"),
  );

  buttons.forEach((button) => {
    button.addEventListener("click", ({ target }) => {
      setLayer(target.dataset.layer, map);
    });
  });
};

document.addEventListener("DOMContentLoaded", main);
