import {
  drawChart,
  setupScrollButtons
} from "./WeatherChart.js";
import styles from "../styles.js";

const chartContainers = Array.from(
  document.querySelectorAll(".wx-hourly-wind-chart-container"),
);

/**
 * Source image for the arrow icon
 */
const IMG_WIDTH = 16;
const IMG_HEIGHT = 16;
const IMG_HEIGHT_OFFSET = IMG_HEIGHT / 2;
const IMG_WIDTH_OFFSET = IMG_WIDTH / 2;
const createArrowSVG = (label, degrees, color = "#3D4551") => {
  // We rotate the degrees by 180,
  // since the supplied angle represents where
  // the wind is blowing _from_
  const arrowDegrees = degrees + 180;
  const encodedColor = encodeURIComponent(color);
  return (
    "data:image/svg+xml;utf8," +
    `<svg width="${IMG_WIDTH}" height="${IMG_HEIGHT}" viewBox="0 0 ${IMG_WIDTH} ${IMG_HEIGHT}" fill="none" xmlns="http://www.w3.org/2000/svg" style="transform:rotate(${arrowDegrees}deg);transform-origin:center;">` +
    '<rect width="16" height="16" transform="translate(0.625)"/>' +
    `<path fill-rule="evenodd" clip-rule="evenodd" d="M2.96808 6.46448L4.38229 7.88059L7.625 4.63354L7.625 9.97052H9.625L9.625 4.63372L12.8676 7.88065L14.2818 6.46454L10.0391 2.21618L10.0391 2.21616L8.62493 0.800049L2.96808 6.46448ZM9.625 11.9705H7.625V14.9584H9.625V11.9705Z" fill="${encodedColor}"/>` +
    "</svg>"
  );
};

/**
 * Pull out all of the relevant wind information
 * from the data attributes on the element
 */
const getCombinedWindInfo = (element) => {
  const times = JSON.parse(element.dataset.times);
  const speeds = JSON.parse(element.dataset.windSpeeds);
  const directions = JSON.parse(element.dataset.windDirections);
  const gusts = JSON.parse(element.dataset.windGusts);

  return times.map((time, idx) =>
    Object.assign(
      {},
      {
        time,
        speed: speeds[idx],
        gusts: gusts[idx],
        direction: directions[idx],
      },
    ),
  );
};

/**
 * Draw the wind direction arrows and cardinal direction
 * text for the given chart on the x-axis.
 * Designed to be used in an `afterDraw` plugin function,
 * which occurs after the rest of the chart has already
 * been rendered
 */
const drawWindInfoLabels = (chart) => {
  const ctx = chart.ctx;
  const xAxis = chart.scales.x;
  const yAxis = chart.scales.y;
  const container = chart.canvas.closest(".wx-hourly-wind-chart-container");
  const windInfo = getCombinedWindInfo(container);
  xAxis.ticks.forEach((val, idx) => {
    const x = xAxis.getPixelForTick(idx);
    const dataIndex = val.value;

    // Draw the arrow with rotation
    const drawX = x;
    const drawY = yAxis.bottom + 40;
    const img = new Image();
    img.src = createArrowSVG(
      "",
      windInfo[dataIndex].direction.degrees,
      styles.colors.secondaryDarker,
    );
    ctx.save();
    ctx.drawImage(img, drawX - IMG_WIDTH_OFFSET, drawY - IMG_HEIGHT_OFFSET);
    ctx.restore();

    // Draw the cardinal direction text
    const text = windInfo[dataIndex].direction.cardinalShort;
    ctx.save();
    const textMeasure = ctx.measureText(text);
    const textMarginRight = 2;
    const textX = drawX - textMeasure.width / 2 - textMarginRight;
    const textY = drawY + Math.max(img.height, img.width) + 8;
    ctx.fillStyle = styles.colors.secondaryDarker;
    ctx.font = "bold 16px DM Mono";
    ctx.fillText(text, textX, textY);
    ctx.restore();
  });
};

for (const container of chartContainers) {
  const times = JSON.parse(container.dataset.times);
  const speeds = JSON.parse(container.dataset.windSpeeds);
  const gusts = JSON.parse(container.dataset.windGusts);

  const config = {
    type: "line",
    plugins: [
      {
        afterDraw: drawWindInfoLabels,
      },
    ],

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
      layout: {
        padding: {
          top: 24,
          bottom: 50,
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
          min: 0,
          max: Math.max(
            Math.round(Math.max(...speeds) / 10) * 10 + 10,
            Math.round(Math.max(...gusts) / 10) * 10 + 10,
          ),
          ticks: {
            autoSkip: true,
            color: styles.colors.base,
            maxTicksLimit: 6,
            callback: (v) => `${v} mph`,
          },
        },
      },
    },

    data: {
      labels: times,
      datasets: [
        {
          label: "Speed",
          data: speeds,
          datalabels: {
            align: ({ dataIndex }) =>
              speeds[dataIndex] >= gusts[dataIndex] ? "top" : "bottom",
            color: styles.colors.primaryDark,
          },
          backgroundColor: styles.colors.secondaryDarker,
          borderColor: styles.colors.secondaryDarker,
          borderWidth: 1.5,
        },
        {
          label: "Gusts",
          data: gusts,
          datalabels: {
            align: ({ dataIndex }) =>
              speeds[dataIndex] >= gusts[dataIndex] ? "bottom" : "top",
            color: styles.colors.primary,
            display: ({ dataIndex }) => speeds[dataIndex] !== gusts[dataIndex],
          },
          borderDash: [4],
          backgroundColor: styles.colors.secondary,
          borderColor: styles.colors.secondary,
          borderWidth: 1.5,
        },
      ],
    },
  };

  drawChart(container, config);
  setupScrollButtons(container);
}
