import { WeatherChartElement } from "./WeatherChart.js";
import styles from "../styles.js";

class HourlyTempChart extends WeatherChartElement {
  constructor() {
    super();
  }

  connectedCallback() {
    super.connectedCallback();

    // Pull out the data from the element's
    // dataset attributes
    this.times = JSON.parse(this.dataset.times);
    this.temps = JSON.parse(this.dataset.temps).map((v) => {
      return Number.parseInt(v, 10);
    });
    this.feelsLike = JSON.parse(this.dataset.feelsLike).map((v) =>
      Number.parseInt(v, 10),
    );

    // Draw the chart!
    this.drawChart();
  }

  getConfig() {
    const hideYAxis = this.dataset.hideYAxis === "true";
    const useMaxY = this.dataset.useMaxY === "true";

    let yMax = Math.max(
      Math.round(Math.max(...this.temps) / 10) * 10 + 10,
      Math.round(Math.max(...this.feelsLike) / 10) * 10 + 10,
    );

    if (useMaxY) {
      yMax =
        Math.max(
          Math.round(Math.max(...this.feelsLike)),
          Math.round(Math.max(...this.temps)),
        ) + 1;
    }
    return {
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
            events: ["click", "mousemove", "mouseout"],
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
              color: this.times.map((v) => {
                if (v === "12 AM") {
                  return "black";
                }

                const even = Number.parseInt(v, 10) % 2 === 0;
                if (even) {
                  return styles.colors.baseLighter;
                }
                return styles.colors.baseLightest;
              }),
              display: !hideYAxis,
            },
          },
          y: {
            min: Math.min(
              Math.round(Math.min(...this.temps) / 10) * 10 - 10,
              Math.round(Math.min(...this.feelsLike) / 10) * 10 - 10,
            ),
            max: yMax,
            ticks: {
              autoSkip: true,
              color: styles.colors.base,
              maxTicksLimit: 6,
              callback: (v) => `${v}°`,
            },
            display: !hideYAxis,
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
        labels: this.times,
        datasets: [
          {
            label: "Temperature",
            data: this.temps,
            datalabels: {
              align: ({ dataIndex }) =>
                this.temps[dataIndex] >= this.feelsLike[dataIndex]
                  ? "top"
                  : "bottom",
              color: styles.colors.primaryDark,
            },
            backgroundColor: styles.colors.primaryDark,
            borderColor: styles.colors.primaryDark,
            borderWidth: 1.5,
          },
          {
            label: "Feels like",
            data: this.feelsLike,
            datalabels: {
              align: ({ dataIndex }) =>
                this.temps[dataIndex] >= this.feelsLike[dataIndex]
                  ? "bottom"
                  : "top",
              color: styles.colors.primary,
              display: ({ dataIndex }) =>
                this.temps[dataIndex] !== this.feelsLike[dataIndex],
            },
            borderDash: [4],
            backgroundColor: styles.colors.primaryLight,
            borderColor: styles.colors.primaryLight,
            borderWidth: 1.5,
          },
        ],
      },
    };
  }
}

window.customElements.define("wx-temp-chart", HourlyTempChart);
