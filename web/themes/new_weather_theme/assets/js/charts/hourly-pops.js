/* global Chart ChartDataLabels */
(() => {
  const styles = getComputedStyle(document.body);

  const fontMono = styles.getPropertyValue("--font-family-mono");
  const colors = {
    base: styles.getPropertyValue("--color-base"),
    baseLighter: styles.getPropertyValue("--color-base-lighter"),
    baseLightest: styles.getPropertyValue("--color-base-lightest"),
    primary: styles.getPropertyValue("--color-primary"),
    primaryDark: styles.getPropertyValue("--color-primary-dark"),
    primaryLight: styles.getPropertyValue("--color-primary-light"),
    cyan50: styles.getPropertyValue("--color-cyan-50"),
  };

  Chart.register(ChartDataLabels);

  // These are applied globally to all charts. Unclear if that's okay, or if
  // what we really want is to set them per-chart, but this is what I've got
  // for now.
  Chart.defaults.font.family = fontMono;
  Chart.defaults.font.size = 12;

  const chartContainers = Array.from(
    document.querySelectorAll(".wx-hourly-pops-chart-container"),
  );

  for (const container of chartContainers) {
    const times = JSON.parse(container.dataset.times);
    const pops = JSON.parse(container.dataset.pops).map((v) =>
      Number.parseInt(v, 10),
    );

    // We don't need to keep a reference to the chart object. We only need the
    // side-effects of creating it. This is not ideal, but it's how Chart.js
    // works, so it's what we've got.
    // eslint-disable-next-line no-new
    new Chart(container.querySelector("canvas"), {
      type: "bar",
      plugins: [ChartDataLabels],

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
              color: colors.base,
            },
            grid: { display: false },
          },
          y: {
            min: 0,
            max: 100,
            ticks: {
              autoSkip: true,
              color: colors.base,
              maxTicksLimit: 6,
              callback: (v) => `${v}%`,
            },
          },
        },
      },

      data: {
        labels: times.map((v) => (Number.parseInt(v, 10) % 2 === 0 ? v : "")),
        datasets: [
          {
            label: "Chance of precipitation",
            data: pops,
            datalabels: {
              align: "end",
              anchor: "end",
              color: colors.cyan50,
            },
            backgroundColor: colors.cyan50,
          },
        ],
      },
    });
  }
})();
