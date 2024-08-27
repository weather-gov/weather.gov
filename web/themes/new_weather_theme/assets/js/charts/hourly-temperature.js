/* global Chart ChartDataLabels */
(() => {
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

    const chart = new Chart(container.querySelector("canvas"), {
      type: "line",
      plugins: [ChartDataLabels],

      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            align: "start",
            position: "bottom",
          },
        },
        scales: {
          x: {
            ticks: { maxRotation: 0 },
            grid: {
              color: times.map((v) => {
                if (v === "12 AM") {
                  return "black";
                }

                const even = Number.parseInt(v, 10) % 2 === 0;
                if (even) {
                  return "#ccc";
                }
                return "#eee";
              }),
            },
          },
          y: {
            min: Math.min(
              0,
              Math.min(...temps) - 15,
              Math.min(...feelsLike) - 15,
            ),
            max: Math.max(
              100,
              Math.max(...temps) + 15,
              Math.max(...feelsLike) + 15,
            ),
            ticks: {
              autoSkip: true,
              maxTicksLimit: 6,
              callback: (v) => `${v}℉`,
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
              align: (_, i) => (temps[i] > feelsLike[i] ? "top" : "bottom"),
            },
          },
          {
            label: "Feels like",
            data: feelsLike,
            borderDash: [4],
            datalabels: {
              align: (_, i) => (temps[i] > feelsLike[i] ? "bottom" : "top"),
            },
          },
        ],
      },
    });
  }
})();
