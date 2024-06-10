import * as leaflet from "https://unpkg.com/leaflet@1.9.4/dist/leaflet-src.esm.js";

const main = async () => {
  const map = leaflet.map("map").setView([40, -70], 8);

  const plottedPolygons = new Map();

  const addGrid = async () => {
    const wfo = document.querySelector("#wfo").value.toUpperCase();
    const x = document.querySelector("#gridX").value;
    const y = document.querySelector("#gridY").value;

    const polygonId = `${wfo}/${x}/${y}`;

    if (!plottedPolygons.has(polygonId)) {
      const grid = await fetch(
        `https://api.weather.gov/gridpoints/${wfo}/${x},${y}`,
      ).then((response) => response.json());

      const coordinates = grid.geometry.coordinates[0]
        .slice(1)
        .map(([lat, lon]) => [lon, lat]);

      const polygon = leaflet.polygon(coordinates).addTo(map);
      plottedPolygons.set(`${wfo}/${x}/${y}`, polygon);
    }

    map.fitBounds(plottedPolygons.get(polygonId).getBounds());
  };

  // Leaflet is managed by a Ukrainian team. The default attribution they put on
  // maps includes a Ukrainian flag to show their national pride. But as an
  // official website of the US Government, that might not be appropriate for
  // us, so turn off the attribution. We're not likely to use Leaflet in the
  // end anyway, but if we do, we'll figure out how to put back attributions
  // without the flag then.
  map.attributionControl.setPrefix("");

  leaflet
    .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    })
    .addTo(map);

  document.querySelector("#add").addEventListener("click", addGrid);
};

main();
