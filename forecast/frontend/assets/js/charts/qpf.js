import { WeatherChartElement } from "./WeatherChart.js";
import styles from "../styles.js";

const round = (number, decimals) =>
  Math.round(number * 100 ** decimals) / 100 ** decimals;

const makePattern = async (imageUrl, size = 60) =>
  new Promise((resolve) => {
    const image = new Image();
    image.src = imageUrl;
    image.onload = () => {
      const imageCanvas = document.createElement("canvas");
      imageCanvas.width = size;
      imageCanvas.height = size;

      const imageContext = imageCanvas.getContext("2d");
      imageContext.drawImage(image, 0, 0, size, size);

      const pattern = imageContext.createPattern(imageCanvas, "repeat");

      resolve(pattern);
    };
  });

// We use esbuild to bundle our scripts together in testing and deployment. It
// currently does not support top-level await, so we have to wrap those in a
// function. That's why this is here.
class QPFChart extends WeatherChartElement {
  constructor() {
    super();
  }

  async connectedCallback() {
    super.connectedCallback();

    // Get the pattern SVG data
    this.snowPattern = await makePattern(
      "/public/images/weather/wx_snow_pattern.svg",
    );
    this.icePattern = await makePattern(
      "/public/images/weather/wx_ice_pattern.svg",
    );

    // Pull out the data we need from the
    // elements' dataset attributes
    this.times = JSON.parse(this.dataset.times);

    this.liquid = JSON.parse(this.dataset.liquid).map((v) =>
      round(Number.parseFloat(v, 10), 2),
    );
    this.snow = JSON.parse(this.dataset.snow).map((v) =>
      round(Number.parseFloat(v, 10), 2),
    );
    this.ice = JSON.parse(this.dataset.ice).map((v) =>
      round(Number.parseFloat(v, 10), 2),
    );

    // Draw the chart!
    this.drawChart();
  }

  getConfig() {
    const datasets = [];

    const liquidTitle =
      this.ice.length > 0 || this.snow.length > 0 ? "Water" : "Rain";

    if (this.snow.length > 0) {
      datasets.push({
        label: "Snow",
        data: this.snow,
        datalabels: {
          align: "end",
          anchor: "end",
          color: styles.colors.baseDarker,
        },
        backgroundColor: this.snowPattern,
        borderColor: styles.colors.baseDarker,
        borderWidth: 1,
      });
    }
    if (this.ice.length > 0) {
      datasets.push({
        label: "Ice",
        data: this.ice,
        datalabels: {
          align: "end",
          anchor: "end",
          color: styles.colors.cyan80,
        },
        backgroundColor: this.icePattern,
        borderColor: styles.colors.cyan80,
        borderWidth: 1,
      });
    }
    if (this.liquid.length > 0) {
      datasets.push({
        label: liquidTitle,
        data: this.liquid,
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
        layout: {
          padding: {
            top: 24,
            bottom: 12,
          },
        },
      },

      data: {
        labels: this.times,
        datasets,
      },
    };
  }
}

window.customElements.define("wx-qpf-chart", QPFChart);
