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
Chart.defaults.plugins.tooltip.enabled = false;

const drawChart = (container, config) => {
  const canvas = container.querySelector("canvas");
  config.options.devicePixelRatio = 4;
  return new Chart(canvas, config);
};

const setupScrollButtons = (container) => {
  const isSynced = container.dataset.syncScrolling === "true";
  const wrapper = container.closest('.wx-chart-wrapper');
  const left = wrapper.querySelector('.wx-scroll-button[data-direction="left"]');
  const right = wrapper.querySelector('.wx-scroll-button[data-direction="right"]');
  if(!left || !right){
    return;
  }

  right.addEventListener("click", () => {
    const canvasEl = container.querySelector("canvas");
    const fullWidth = canvasEl.offsetWidth;
    const shownWidth = container.offsetWidth;
    const remainingWidth = fullWidth - shownWidth - container.scrollLeft;
    const scrollAmount = Math.min(remainingWidth, shownWidth);

    if(isSynced){
      Array.from(
        container
          .closest("li")
          .querySelectorAll('.wx-chart-wrapper .wx-chart[data-sync-scrolling="true"]')
      ).forEach(chartContainer => {
        chartContainer.scrollTo({
          left: scrollAmount + container.scrollLeft,
          behavior: "smooth",
        });
      });
    } else {
      container.scrollTo({
        left: scrollAmount + container.scrollLeft,
        behavior: "smooth",
      });
    }    
  });

  left.addEventListener("click", () => {
    const shownWidth = container.offsetWidth;
    const scrollPosition = Math.max(
      0,
      container.scrollLeft - shownWidth
    );
    if(isSynced){
      Array.from(
        container
          .closest("li")
          .querySelectorAll('.wx-chart-wrapper .wx-chart[data-sync-scrolling]')
      ).forEach(chartContainer => {
        chartContainer.scrollTo({
          left: scrollPosition,
          behavior: "smooth"
        });
      });
    } else {
      container.scrollTo({
        left: scrollPosition,
        behavior: "smooth"
      });
    }
  });
};

export {
  drawChart,
  setupScrollButtons
};
