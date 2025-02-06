import { drawChart } from "./WeatherChart.js";
import styles from "../styles.js";

const round = (number, decimals) =>
  Math.round(number * 100 ** decimals) / 100 ** decimals;

const chartContainers = Array.from(
  document.querySelectorAll(".wx-qpf-chart-container"),
);

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
const createCharts = async () => {
  const snowPattern = await makePattern(
    "/assets/images/weather/wx_snow_pattern.svg",
  );
  const icePattern = await makePattern(
    "/assets/images/weather/wx_ice_pattern.svg",
  );

  for (const container of chartContainers) {
    const times = JSON.parse(container.dataset.times);

    const liquid = JSON.parse(container.dataset.liquid).map((v) =>
      round(Number.parseFloat(v, 10), 2),
    );
    const snow = JSON.parse(container.dataset.snow).map((v) =>
      round(Number.parseFloat(v, 10), 2),
    );
    const ice = JSON.parse(container.dataset.ice).map((v) =>
      round(Number.parseFloat(v, 10), 2),
    );

    const datasets = [];

    const liquidTitle = ice.length > 0 || snow.length > 0 ? "Water" : "Rain";

    if (snow.length > 0) {
      datasets.push({
        label: "Snow",
        data: snow,
        datalabels: {
          align: "end",
          anchor: "end",
          color: styles.colors.baseDarker,
        },
        backgroundColor: snowPattern,
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
        backgroundColor: icePattern,
        borderColor: styles.colors.cyan80,
        borderWidth: 1,
      });
    }
    if (liquid.length > 0) {
      datasets.push({
        label: liquidTitle,
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
        labels: times,
        datasets,
      },
    };

    drawChart(container, config);
  }
};

createCharts();
