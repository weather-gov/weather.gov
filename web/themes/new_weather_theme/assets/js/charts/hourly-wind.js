/* global Chart ChartDataLabels */

import styles from "../styles.js";

Chart.register(ChartDataLabels);

const chartContainers = Array.from(
  document.querySelectorAll(".wx-hourly-wind-chart-container")
);

for(const container of chartContainers){
  const times = JSON.parse(container.dataset.times);
  const speeds = JSON.parse(container.dataset.windSpeeds);
  const directions = JSON.parse(container.dataset.windDirections);
  const directionShortNames = directions.map(direction => {
    return direction.short;
  });
  console.log(directions);
  const directionDegrees = directions.map(direction => {
    return direction.angle;
  });
  const gusts = JSON.parse(container.dataset.windGusts);

  // We don't need to keep a reference to the chart object. We only need the
  // side-effects of creating it. This is not ideal, but it's how Chart.js
  // works, so it's what we've got.
  // eslint-disable-next-line no-new
  new Chart(container.querySelector("canvas"), {
    type: "line",
    plugins: [
      ChartDataLabels,
      {
        afterDraw: chart => {
          const ctx = chart.ctx;
          const xAxis = chart.scales.x;
          const yAxis = chart.scales.y;
          xAxis.ticks.forEach((val, idx) =>
            {
              const x = xAxis.getPixelForTick(idx);

              // Draw the arrow with rotation
              const drawX = x;
              const drawY = yAxis.bottom + 20;
              const img = new Image();
              img.src = "/themes/new_weather_theme/assets/images/weather/icons/wx_wind_arrow.svg";
              const imgOffsetX = img.width / 2;
              const imgOffsetY = img.height / 2;
              const degrees = directionDegrees[idx] * (Math.PI/180);
              ctx.save();
              ctx.translate(drawX, drawY);
              ctx.rotate(degrees);
              ctx.translate(-(drawX + imgOffsetX), -(drawY + imgOffsetY));
              ctx.drawImage(img, drawX, drawY);
              ctx.restore();

              // Draw the cardinal direction text
              const text = directionShortNames[idx];
              ctx.save();
              const textMeasure = ctx.measureText(text);
              const textX = drawX - (textMeasure.width / 2);
              const textY = drawY + Math.max(img.height, img.width) + 4;
              ctx.fillStyle = styles.colors.secondary;
              ctx.font ="bold 16px DM Mono";
              ctx.fillText(text, textX, textY);
              ctx.restore();
            });

          // Draw the bottom border line
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(xAxis.left, yAxis.bottom + 40);
          ctx.lineTo(xAxis.right, yAxis.bottom + 40);
          ctx.closePath();
          ctx.stroke();
          ctx.restore();
        }
      }
    ],

    options: {
      animation: false,
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {
          bottom: 50
        }
      },
      interaction: {
        intersect: false,
        mode: "index",
      },
      plugins: {
        legend: {
          display: false,
        }
      },
      scales: {
        x: {
          ticks: {
            autoSkip: true,
            maxRotation: 0,
            color: styles.colors.base,
            padding: 40
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
            display: ({ dataIndex }) =>
              speeds[dataIndex] !== gusts[dataIndex],
          },
          borderDash: [4],
          backgroundColor: styles.colors.secondary,
          borderColor: styles.colors.secondary,
          borderWidth: 1.5,
        },
      ],
    },
  });
}
