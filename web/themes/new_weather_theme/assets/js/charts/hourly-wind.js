/* global Chart ChartDataLabels */

import styles from "../styles.js";

Chart.register(ChartDataLabels);

const chartContainers = Array.from(
  document.querySelectorAll(".wx-hourly-wind-chart-container")
);

for(const container of chartContainers){
  const times = JSON.parse(container.dataset.times);
  const speeds = JSON.parse(container.dataset.windSpeeds);
  const directions = JSON.parse(container.dataset.windDirections);
  const directionShortNames = directions.map(direction => {
    return direction.short;
  });
  const directionDegrees = directions.map(direction => {
    return direction.degrees;
  });
  const gusts = JSON.parse(container.dataset.windGusts);

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
          min: 0,
          max: Math.max(
            Math.round(Math.max(...speeds) / 10) * 10 + 10,
            Math.round(Math.max(...gusts) / 10) * 10 + 10,
          ),
          ticks: {
            autoSkip: true,
            color: styles.colors.base,
            maxTicksLimit: 6,
            callback: (v) => `${v} mph`,
          },
        },
      },
    },

    data: {
      labels: times,
      datasets: [
        {
          label: "Speed",
          data: speeds,
          datalabels: {
            align: ({ dataIndex }) =>
              speeds[dataIndex] >= gusts[dataIndex] ? "top" : "bottom",
            color: styles.colors.primaryDark,
          },
          backgroundColor: styles.colors.secondaryDarker,
          borderColor: styles.colors.secondaryDarker,
          borderWidth: 1.5,
        },
        {
          label: "Gusts",
          data: gusts,
          datalabels: {
            align: ({ dataIndex }) =>
              speeds[dataIndex] >= gusts[dataIndex] ? "bottom" : "top",
            color: styles.colors.primary,
            display: ({ dataIndex }) =>
              speeds[dataIndex] !== gusts[dataIndex],
          },
          borderDash: [4],
          backgroundColor: styles.colors.secondary,
          borderColor: styles.colors.secondary,
          borderWidth: 1.5,
        },
      ],
    },
  });
}
