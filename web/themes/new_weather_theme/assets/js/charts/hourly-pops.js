import { drawChart } from "./WeatherChart.js";
import styles from "../styles.js";

const chartContainers = Array.from(
  document.querySelectorAll(".wx-hourly-pops-chart-container"),
);

for (const container of chartContainers) {
  const times = JSON.parse(container.dataset.times);
  const pops = JSON.parse(container.dataset.pops).map((v) =>
    Number.parseInt(v, 10),
  );

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
  };

  drawChart(container, config);
}
