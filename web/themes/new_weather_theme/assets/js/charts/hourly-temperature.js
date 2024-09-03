/* global Chart ChartDataLabels */
(() => {
  const fontMono = `DM Mono, "Roboto Mono Web", "Courier New", monospace, serif`;

  const colors = {
    base: "#71767A",
    baseLighter: "#DFE1E2",
    baseLightest: "#F5F6F7",
    primary: "#005EA2",
    primaryDark: "#0B4778",
    primaryLight: "#0085CA",
  };

  Chart.register(ChartDataLabels);

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

    // These are applied globally to all charts. Unclear if that's okay, or if
    // what we really want is to set them per-chart, but this is what I've got
    // for now.
    Chart.defaults.font.family = fontMono;
    Chart.defaults.font.size = `10px`;

    // We don't need to keep a reference to the chart object. We only need the
    // side-effects of creating it. This is not ideal, but it's how Chart.js
    // works, so it's what we've got.
    // eslint-disable-next-line no-new
    new Chart(container.querySelector("canvas"), {
      type: "line",
      plugins: [ChartDataLabels],

      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          x: {
            ticks: {
              maxRotation: 0,
              color: colors.base,
            },
            grid: {
              color: times.map((v) => {
                if (v === "12 AM") {
                  return "black";
                }

                const even = Number.parseInt(v, 10) % 2 === 0;
                if (even) {
                  return colors.baseLighter;
                }
                return colors.baseLightest;
              }),
            },
          },
          y: {
            min: Math.min(
              // 0,
              Math.round(Math.min(...temps) / 10) * 10 - 10,
              Math.round(Math.min(...feelsLike) / 10) * 10 - 10,
            ),
            max: Math.max(
              // 100,
              Math.round(Math.max(...temps) / 10) * 10 + 10,
              Math.round(Math.max(...feelsLike) / 10) * 10 + 10,
            ),
            ticks: {
              autoSkip: true,
              color: colors.base,
              maxTicksLimit: 6,
              callback: (v) => `${v}°`,
            },
          },
        },
      },

      data: {
        labels: times.map((v) => (Number.parseInt(v, 10) % 2 === 0 ? v : "")),
        datasets: [
          {
            label: "Temperature",
            data: temps,
            datalabels: {
              align: ({ dataIndex }) =>
                temps[dataIndex] >= feelsLike[dataIndex] ? "top" : "bottom",
              color: colors.primaryDark,
            },
            backgroundColor: colors.primaryDark,
            borderColor: colors.primaryDark,
            borderWidth: 1.5,
          },
          {
            label: "Feels like",
            data: feelsLike,
            datalabels: {
              align: ({ dataIndex }) =>
                temps[dataIndex] >= feelsLike[dataIndex] ? "bottom" : "top",
              color: colors.primary,
            },
            borderDash: [4],
            backgroundColor: colors.primaryLight,
            borderColor: colors.primaryLight,
            borderWidth: 1.5,
          },
        ],
      },
    });
  }
})();
