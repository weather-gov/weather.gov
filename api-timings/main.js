const row = (entry) => `<td>${entry.time}</td><td>${entry.correlation}</td>`;

const timings = await fetch("./timings.csv")
  .then((response) => response.text())
  .then((text) => {
    const lines = text.trim().split("\n");
    const headings = lines[0].split("\t");

    const times = {
      points: [],
      gridpoints: [],
      "daily forecast": [],
      "hourly forecast": [],
      "station list": [],
      observations: [],
      unknown: [],
    };

    lines.slice(1).forEach((line) => {
      const values = line.split("\t");
      const obj = {};

      for (let i = 0; i < values.length; i += 1) {
        obj[headings[i]] = values[i];
      }
      obj.time = +obj.time;

      if (/^\/points\//.test(obj.url)) {
        times.points.push(obj);
      } else if (obj.url.endsWith("/forecast/hourly")) {
        times["hourly forecast"].push(obj);
      } else if (obj.url.endsWith("/forecast")) {
        times["daily forecast"].push(obj);
      } else if (obj.url.endsWith("/stations?limit=3")) {
        times["station list"].push(obj);
      } else if (/^\/gridpoints\//.test(obj.url)) {
        times.gridpoints.push(obj);
      } else if (/\/observations(\/latest|\?limit=1)?$/.test(obj.url)) {
        times.observations.push(obj);
      } else {
        times.unknown.push(obj);
      }
    });

    return times;
  });

Object.entries(timings).forEach(([kind, rows]) => {
  if (rows.length === 0) {
    return;
  }

  const times = rows.map(({ time }) => time);
  const max = Math.max(...times);
  const min = Math.min(...times);
  const avg =
    Math.round(
      (10 * times.reduce((sum, time) => sum + time, 0)) / times.length,
    ) / 10;

  const sorted = JSON.parse(JSON.stringify(rows));
  sorted.sort(({ time: a }, { time: b }) => b - a);

  const canvasId = `canvas_${Math.floor(Math.random() * 10_000_000)}`;

  const container = document.createElement("div");
  container.innerHTML = `<h3>${kind} (eg: <a href="https://api.weather.gov${rows[0].url}">${rows[0].url}</a>)</h3>

  <pre>
    Average response:  ${avg} ms
    Longest response:  ${max} ms
    Shortest response: ${min} ms
  </pre>

  <div class="grid-row">
  <div class="grid-col-6">
  <div class="border-1px" style="display: inline-block; max-height: 50vh; overflow-y: scroll;"><table class="usa-table usa-table--striped margin-0 font-mono-sm"><thead><tr><th>response (ms)</th><th>correlation ID</th></thead><tbody>${sorted.map((entry) => `<tr>${row(entry)}</tr>`).join("")}</tbody></table></div>
  </div>
  <div class="grid-col-6 bg-white">
  <canvas id="${canvasId}"></canvas>
  </div>
  </div>
  <hr class="margin-y-4">`;
  document.querySelector("main").append(container);

  new window.Chart(document.getElementById(canvasId), {
    type: "line",
    data: {
      labels: rows.map((_, i) => i),
      datasets: [
        { label: "response times", data: rows.map(({ time }) => time) },
      ],
    },
  });
});
