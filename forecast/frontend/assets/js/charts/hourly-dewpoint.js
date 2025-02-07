import {
  drawChart,
  setupScrollButtons
} from "./WeatherChart.js";
import styles from "../styles.js";

const chartContainers = Array.from(
  document.querySelectorAll(".wx-hourly-dewpoint-chart-container"),
);

for (const container of chartContainers) {
  const times = JSON.parse(container.dataset.times);
  const dewpoints = JSON.parse(container.dataset.dewpoints).map((v) =>
    Number.parseInt(v, 10),
  );

  const config = {
    type: "line",

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
          events: ['click', 'mousemove', 'mouseout'],
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
          min: Math.round(Math.min(...dewpoints) / 10) * 10 - 10,
          max: Math.round(Math.max(...dewpoints) / 10) * 10 + 10,
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
          label: "Dewpoint",
          data: dewpoints,
          datalabels: {
            align: "top",
            color: styles.colors.accentCoolDark,
          },
          backgroundColor: styles.colors.accentCoolDark,
          borderColor: styles.colors.accentCoolDark,
          borderWidth: 1.5,
        },
      ],
    },
  };

  drawChart(container, config);
  setupScrollButtons(container);
}
