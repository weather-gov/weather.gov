import {
  drawChart,
  setupScrollButtons
} from "./WeatherChart.js";
import styles from "../styles.js";

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
  const hideYAxis = container.dataset.hideYAxis === "true";
  const useMaxY = container.dataset.useMaxY === "true";

  let yMax = Math.max(
    Math.round(Math.max(...temps) / 10) * 10 + 10,
    Math.round(Math.max(...feelsLike) / 10) * 10 + 10,
  );

  if(useMaxY){
    yMax = Math.max(
      Math.round(Math.max(...feelsLike)),
      Math.round(Math.max(...temps))
    ) + 1;
  }

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
            display: !hideYAxis
          },
        },
        y: {
          min: Math.min(
            Math.round(Math.min(...temps) / 10) * 10 - 10,
            Math.round(Math.min(...feelsLike) / 10) * 10 - 10,
          ),
          max: yMax,
          ticks: {
            autoSkip: true,
            color: styles.colors.base,
            maxTicksLimit: 6,
            callback: (v) => `${v}°`,
          },
          display: !hideYAxis
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
  };

  
  drawChart(container, config);
  setupScrollButtons(container);
}
