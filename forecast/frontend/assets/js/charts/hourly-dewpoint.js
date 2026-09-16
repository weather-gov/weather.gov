import { WeatherChartElement } from "./WeatherChart.js";
import styles from "../styles.js";

class HourlyDewpointChart extends WeatherChartElement {
  constructor() {
    super();
  }

  connectedCallback() {
    super.connectedCallback();

    // Pull the required data from the dataset attributes
    this.times = JSON.parse(this.dataset.times);
    this.dewpoints = JSON.parse(this.dataset.dewpoints).map((v) => {
      return Number.parseInt(v, 10);
    });

    // Draw the chart!
    this.drawChart();
  }

  getConfig() {
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
            },
          },
          y: {
            min: Math.round(Math.min(...this.dewpoints) / 10) * 10 - 10,
            max: Math.round(Math.max(...this.dewpoints) / 10) * 10 + 10,
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
        labels: this.times,
        datasets: [
          {
            label: "Dewpoint",
            data: this.dewpoints,
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
  }
}

window.customElements.define("wx-dewpoint-chart", HourlyDewpointChart);
