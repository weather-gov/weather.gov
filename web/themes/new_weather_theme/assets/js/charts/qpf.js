/* global Chart ChartDataLabels */

import styles from "../styles.js";

Chart.register(ChartDataLabels);

const round = (number, decimals) =>
  Math.round(number * 10 ** decimals) / 10 ** decimals;

const chartContainers = Array.from(
  document.querySelectorAll(".wx-qpf-chart-container"),
);

for (const container of chartContainers) {
  const times = JSON.parse(container.dataset.times);

  const liquid = JSON.parse(container.dataset.liquid).map((v) =>
    round(Number.parseFloat(v, 10), 1),
  );
  const snow = JSON.parse(container.dataset.snow).map((v) =>
    round(Number.parseFloat(v, 10), 1),
  );
  const ice = JSON.parse(container.dataset.ice).map((v) =>
    round(Number.parseFloat(v, 10), 1),
  );

  const datasets = [];

  if (snow.length > 0) {
    datasets.push({
      label: "Snow",
      data: snow,
      datalabels: {
        align: "end",
        anchor: "end",
        color: styles.colors.baseDarker,
      },
      backgroundColor: styles.colors.white,
      borderColor: styles.colors.baseDarker,
      borderWidth: 1,
    });
  }
  if (ice.length > 0) {
    datasets.push({
      label: "Ice",
      data: ice,
      datalabels: {
        align: "end",
        anchor: "end",
        color: styles.colors.cyan80,
      },
      backgroundColor: styles.colors.cyan60,
      borderColor: styles.colors.cyan80,
      borderWidth: 1,
    });
  }
  if (liquid.length > 0) {
    datasets.push({
      label: "Water",
      data: liquid,
      datalabels: {
        align: "end",
        anchor: "end",
        color: styles.colors.accentCoolDark,
      },
      backgroundColor: styles.colors.accentCool,
      borderColor: styles.colors.accentCoolDark,
      borderWidth: 1,
    });
  }

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
          ticks: {
            autoSkip: true,
            color: styles.colors.base,
            maxTicksLimit: 6,
            callback: (v) => `${v}"`,
          },
        },
      },
    },

    data: {
      labels: times,
      datasets,
    },
  });
}
