import Formatter from "https://unpkg.com/json-formatter-js@2.5.11/dist/json-formatter.mjs";

const getClientZip = async () =>
  import("https://unpkg.com/client-zip@2.4.5/index.js");

const files = [];

const apiFetch = async (path) => {
  const url = `https://api.weather.gov${path}`;

  const node = document.createElement("div");
  node.classList.add("api-call-container");
  node.innerHTML = `<h4><a href="${url}">${path}</a></h4>`;

  document.getElementById("api_output").appendChild(node);

  const start = performance.now();

  const json = await fetch(url).then((r) => r.json());
  const elapsed = performance.now() - start;
  const f = new Formatter(json);

  const content = document.createElement("div");
  content.appendChild(f.render());

  const h4 = node.querySelector("h4");
  h4.innerHTML = `${h4.innerHTML} - ${elapsed}ms`;

  const parserUrl = new URL(url);
  const pieces = [
    parserUrl.pathname.replace(/\/$/, ""),
    parserUrl.search.replace("?", "__"),
    ".json",
  ];

  const name = pieces.join("");
  files.push({ name, input: JSON.stringify(json, null, 2) });

  node.appendChild(content);
  return json;
};

const download = async () => {
  const { downloadZip } = await getClientZip();

  const zip = await downloadZip(files).blob();

  const link = document.createElement("a");
  link.href = URL.createObjectURL(zip);
  link.download = `bundle_${Date.now()}.zip`;
  link.click();
  link.remove();

  setTimeout(() => {
    URL.revokeObjectURL(link.href);
  }, 100);
};

const doApiCalls = async (lat, lon) => {
  document.getElementById("api_output").innerText = "";
  document.getElementById("api_metadata").innerText = "";

  const start = performance.now();

  const grid = await apiFetch(`/points/${lat},${lon}`).then(async (point) => {
    const wfo = point.properties.gridId.toUpperCase();
    const gridY = point.properties.gridY;
    const gridX = point.properties.gridX;
    const state = point.properties.relativeLocation.properties.state;

    const fetching = [
      apiFetch(`/alerts/active/?status=actual&area=${state}`),
      apiFetch(`/gridpoints/${wfo}/${gridX},${gridY}/`),
      apiFetch(`/gridpoints/${wfo}/${gridX},${gridY}/forecast`),
      apiFetch(`/gridpoints/${wfo}/${gridX},${gridY}/forecast/hourly`),
      apiFetch(`/gridpoints/${wfo}/${gridX},${gridY}/stations`).then(
        async (stations) => {
          const stationID = stations.features[0].properties.stationIdentifier;

          return apiFetch(`/stations/${stationID}/observations?limit=1`);
        },
      ),
      apiFetch(`/products/types/AFD/locations/${wfo}`).then(
        async (response) => {
          const afds = response["@graph"].map(({ issuanceTime, ...data }) => ({
            ...data,
            issuanceTime: new Date(Date.parse(issuanceTime)),
          }));
          afds.sort(({ issuanceTime: a }, { issuanceTime: b }) => {
            if (a > b) {
              return -1;
            }
            if (b > a) {
              return 1;
            }
            return 0;
          });

          if (afds.length > 0) {
            return apiFetch(`/products/${afds[0].id}`);
          }
        },
      ),
    ];

    await Promise.all(fetching);

    return { wfo, gridX, gridY, state };
  });

  const elapsed = performance.now() - start;
  document.getElementById("api_metadata").innerHTML =
    `Total time: ${elapsed} ms - ${grid.wfo} / ${grid.gridX} / ${grid.gridY} / ${grid.state}`;

  document.querySelector("button[download]").removeAttribute("disabled");
};

const main = async () => {
  document
    .querySelector("button[download]")
    .addEventListener("click", download);

  files.length = 0;

  document
    .querySelector("form#lat_lon")
    .addEventListener("submit", async (e) => {
      document
        .querySelector("button[download]")
        .setAttribute("disabled", "true");
      e.preventDefault();

      const lat = +document.getElementById("form__lat").value;
      const lon = +document.getElementById("form__lon").value;

      if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
        doApiCalls(lat, lon);
      }
    });

  document.querySelector("form#url").addEventListener("submit", async (e) => {
    document.querySelector("button[download]").setAttribute("disabled", "true");
    e.preventDefault();

    const url = new URL(document.getElementById("form__url").value).pathname;
    const [, lat, lon] = url.match(/^\/point\/(-?\d+\.\d+)\/(-?\d+\.\d+)/);

    if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
      doApiCalls(lat, lon);
    }
  });
};
main();
