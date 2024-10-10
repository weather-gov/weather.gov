import {
  drawChart,
  setupScrollButtons
} from "./WeatherChart.js";
import styles from "../styles.js";

const chartContainers = Array.from(
  document.querySelectorAll(".wx-hourly-humidity-chart-container"),
);

for (const container of chartContainers) {
  const times = JSON.parse(container.dataset.times);
  const humidity = JSON.parse(container.dataset.humidity).map((v) =>
    Number.parseInt(v, 10),
  );

  // We don't need to keep a reference to the chart object. We only need the
  // side-effects of creating it. This is not ideal, but it's how Chart.js
  // works, so it's what we've got.
  // eslint-disable-next-line no-new
  const config = {
    type: "bar",

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
          events: ['click', 'mousemove', 'mouseout'],
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
      labels: times,
      datasets: [
        {
          label: "Humidity",
          data: humidity,
          datalabels: {
            align: "end",
            anchor: "end",
            color: styles.colors.accentCoolDark,
          },
          backgroundColor: styles.colors.accentCoolDark,
        },
      ],
    },
  };

  drawChart(container, config);
  setupScrollButtons(container);
}
