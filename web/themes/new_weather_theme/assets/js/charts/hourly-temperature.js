/* global Chart ChartDataLabels */

import styles from "../styles.js";

Chart.register(ChartDataLabels);

// These are applied globally to all charts. Unclear if that's okay, or if
// what we really want is to set them per-chart, but this is what I've got
// for now.
Chart.defaults.font = {
  family: styles.font.mono,
  size: 12,
};

const chartContainers = Array.from(
  document.querySelectorAll(".wx-hourly-temp-chart-container"),
);

for (const container of chartContainers) {
  const times = JSON.parse(container.dataset.times);
  const temps = JSON.parse(container.dataset.temps).map((v) =>
    Number.parseInt(v, 10),
  );
  const feelsLike = JSON.parse(container.dataset.feelsLike).map((v) =>
    Number.parseInt(v, 10),
  );

  // We don't need to keep a reference to the chart object. We only need the
  // side-effects of creating it. This is not ideal, but it's how Chart.js
  // works, so it's what we've got.
  // eslint-disable-next-line no-new
  new Chart(container.querySelector("canvas"), {
    type: "line",
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
          events: ['click'],
        },
      },
      scales: {
        x: {
          ticks: {
            autoSkip: true,
            maxRotation: 0,
            color: styles.colors.base,
          },
          grid: {
            color: times.map((v) => {
              if (v === "12 AM") {
                return "black";
              }

              const even = Number.parseInt(v, 10) % 2 === 0;
              if (even) {
                return styles.colors.baseLighter;
              }
              return styles.colors.baseLightest;
            }),
          },
        },
        y: {
          min: Math.min(
            Math.round(Math.min(...temps) / 10) * 10 - 10,
            Math.round(Math.min(...feelsLike) / 10) * 10 - 10,
          ),
          max: Math.max(
            Math.round(Math.max(...temps) / 10) * 10 + 10,
            Math.round(Math.max(...feelsLike) / 10) * 10 + 10,
          ),
          ticks: {
            autoSkip: true,
            color: styles.colors.base,
            maxTicksLimit: 6,
            callback: (v) => `${v}°`,
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
      labels: times,
      datasets: [
        {
          label: "Temperature",
          data: temps,
          datalabels: {
            align: ({ dataIndex }) =>
              temps[dataIndex] >= feelsLike[dataIndex] ? "top" : "bottom",
            color: styles.colors.primaryDark,
          },
          backgroundColor: styles.colors.primaryDark,
          borderColor: styles.colors.primaryDark,
          borderWidth: 1.5,
        },
        {
          label: "Feels like",
          data: feelsLike,
          datalabels: {
            align: ({ dataIndex }) =>
              temps[dataIndex] >= feelsLike[dataIndex] ? "bottom" : "top",
            color: styles.colors.primary,
            display: ({ dataIndex }) =>
              temps[dataIndex] !== feelsLike[dataIndex],
          },
          borderDash: [4],
          backgroundColor: styles.colors.primaryLight,
          borderColor: styles.colors.primaryLight,
          borderWidth: 1.5,
        },
      ],
    },
  });
}
