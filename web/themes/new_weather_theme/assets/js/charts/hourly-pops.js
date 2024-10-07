/* global Chart ChartDataLabels */

import styles from "../styles.js";

Chart.register(ChartDataLabels);

// These are applied globally to all charts. Unclear if that's okay, or if
// what we really want is to set them per-chart, but this is what I've got
// for now.
Chart.defaults.font.family = styles.font.mono;
Chart.defaults.font.size = 12;

const chartContainers = Array.from(
  document.querySelectorAll(".wx-hourly-pops-chart-container"),
);

for (const container of chartContainers) {
  const times = JSON.parse(container.dataset.times);
  const pops = JSON.parse(container.dataset.pops).map((v) =>
    Number.parseInt(v, 10),
  );

  // We don't need to keep a reference to the chart object. We only need the
  // side-effects of creating it. This is not ideal, but it's how Chart.js
  // works, so it's what we've got.
  // eslint-disable-next-line no-new
  new Chart(container.querySelector("canvas"), {
    type: "bar",
    plugins: [ChartDataLabels],

    options: {
      animation: false,
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: "index",
      },

      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          xAlign: "center",
          yAlign: "bottom",
          events: ['click'],
        },
      },
      scales: {
        x: {
          ticks: {
            maxRotation: 0,
            color: styles.colors.base,
          },
          grid: { display: false },
        },
        y: {
          min: 0,
          max: 100,
          ticks: {
            autoSkip: true,
            color: styles.colors.base,
            maxTicksLimit: 6,
            callback: (v) => `${v}%`,
          },
        },
      },
      layout: {
        padding: {
          top: 24,
          bottom: 12,
        },
      },
    },

    data: {
      labels: times.map((v) => (Number.parseInt(v, 10) % 2 === 0 ? v : "")),
      datasets: [
        {
          label: "Chance of precipitation",
          data: pops,
          datalabels: {
            align: "end",
            anchor: "end",
            color: styles.colors.cyan50,
          },
          backgroundColor: styles.colors.cyan50,
        },
      ],
    },
  });
}
