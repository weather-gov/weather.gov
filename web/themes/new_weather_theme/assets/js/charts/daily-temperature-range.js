/* global Chart ChartDataLabels */
(() => {
  Chart.register(ChartDataLabels);

  const container = document.querySelector(
    ".wx-daily-temp-range-chart-container",
  );

  const data = JSON.parse(container.dataset.days);

  const d2 = JSON.parse(JSON.stringify(data));

  const chart = new Chart(container.querySelector("canvas"), {
    plugins: [ChartDataLabels],

    options: {
      animation: false,
      responsive: true,
      maintainAspectRatio: false,
      showLine: false,
      plugins: {
        legend: {
          display: false,
        },
      },
      layout: {
        padding: {
          right: 30,
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
        },
        y: {
          min:
            Math.floor(
              Math.min(...data.map(({ temps }) => Math.min(...temps))) / 10,
            ) * 10,
          max:
            Math.ceil(
              Math.max(...data.map(({ temps }) => Math.max(...temps))) / 10,
            ) * 10,
        },
      },
    },

    data: {
      labels: data.map(({ day }) => day),

      datasets: [
        {
          type: "bar",
          backgroundColor: "transparent",
          borderColor: "transparent",
          data: data.map(({ temps }) => Math.min(...temps)),
          options: { scales: { x: { stacked: true } } },
          stack: "diff",
          datalabels: {
            display: false,
          },
        },

        {
          type: "bar",
          backgroundColor: "rgb(11,71,120)",
          borderColor: "rgb(11,71,120)",
          data: data.map(({ temps }) =>
            Math.abs(temps.reduce((p, n) => n - p, 0)),
          ),
          barThickness: 1,
          options: {
            scales: { x: { stacked: true } },
          },
          stack: "diff",
          datalabels: {
            display: false,
          },
        },
        {
          type: "line",
          backgroundColor: "rgb(11,71,120)",
          borderColor: "rgb(11,71,120)",
          data: data.map(({ temps }) => temps.pop()),
          datalabels: {
            align: "right",
            formatter: (v) => `${v}℉`,
          },
        },
        {
          type: "line",
          backgroundColor: "rgb(11,71,120)",
          borderColor: "rgb(11,71,120)",
          data: data.map(({ temps }) => temps.pop()),
          datalabels: {
            align: "right",
            formatter: (v) => `${v}℉`,
          },
        },
      ],
    },
  });
})();
