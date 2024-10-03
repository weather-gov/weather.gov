import { drawChart } from "./WeatherChart.js";
import styles from "../styles.js";

const round = (number, decimals) =>
  Math.round(number * 10 ** decimals) / 10 ** decimals;

const chartContainers = Array.from(
  document.querySelectorAll(".wx-qpf-chart-container"),
);

const makePattern = async (imageUrl, size = 60) =>
  new Promise((resolve) => {
    const imgage = new Image();
    imgage.src = imageUrl;
    imgage.onload = () => {
      const imageCanvas = document.createElement("canvas");
      imageCanvas.width = size;
      imageCanvas.height = size;

      const imageContext = imageCanvas.getContext("2d");
      imageContext.drawImage(imgage, 0, 0, size, size);
      document.body.insertBefore(imageCanvas, document.body.firstChild);

      const pattern = imageContext.createPattern(imageCanvas, "repeat");

      resolve(pattern);
    };
  });

const snowPattern = await makePattern(
  "/themes/new_weather_theme/assets/images/weather/wx_snow_pattern.svg",
);
const icePattern = await makePattern(
  "/themes/new_weather_theme/assets/images/weather/wx_ice_pattern.svg",
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
    },

    data: {
      labels: times,
      datasets,
    },
  };

  drawChart(container, config);
}
