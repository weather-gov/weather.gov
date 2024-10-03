/* global Chart ChartDataLabels */
import styles from "../styles.js";

Chart.register(ChartDataLabels);

Chart.register({
  id: "wxWhiteBackground",
  beforeDraw: (chart) => {
    const { ctx } = chart;
    ctx.save();
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, chart.width, chart.height);
    ctx.restore();
  },
});

// These are applied globally to all charts. Unclear if that's okay, or if
// what we really want is to set them per-chart, but this is what I've got
// for now.
Chart.defaults.font = {
  family: styles.font.mono,
  size: 12,
};
Chart.defaults.font.size = 12;

const drawChart = (container, config) => {
  const canvas = container.querySelector("canvas");
  config.options.devicePixelRatio = 4;
  return new Chart(canvas, config);
};

export { drawChart };
export default { drawChart };
