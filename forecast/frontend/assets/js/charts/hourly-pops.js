import { WeatherChartElement } from "./WeatherChart.js";
import styles from "../styles.js";

class HourlyPopsChart extends WeatherChartElement {
  constructor() {
    super();
  }

  connectedCallback() {
    super.connectedCallback();

    // Pull out the required data from the dataset attributes
    // on the element
    this.times = JSON.parse(this.dataset.times);
    this.pops = JSON.parse(this.dataset.pops).map((v) => {
      return Number.parseInt(v, 10);
    });

    // Draw the chart!
    this.drawChart();
  }

  getConfig() {
    return {
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
            events: ["click", "mousemove", "mouseout"],
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
        labels: this.times,
        datasets: [
          {
            label: "Chance of precipitation",
            data: this.pops,
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
  }
}

window.customElements.define("wx-pops-chart", HourlyPopsChart);
