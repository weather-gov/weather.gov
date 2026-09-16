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

/**
 * Custom element for drawing and displaying our charts.
 * Note that this specific class is abstract: each type of
 * chart will inherit and define its own configuration and data
 * objects. These subclasses will then call the drawChart
 * method that is already defined here.
 */
export class WeatherChartElement extends HTMLElement {
  constructor() {
    super();

    // Bound methods
    this.drawChart = this.drawChart.bind(this);
    this.setupScrollButtons = this.setupScrollButtons.bind(this);
    this.handleScrollRightClick = this.handleScrollRightClick.bind(this);
    this.handleScrollLeftClick = this.handleScrollLeftClick.bind(this);
    this.scroll = this.scroll.bind(this);
    this.getConfig = this.getConfig.bind(this);
  }

  connectedCallback() {
    this.classList.add("display-block");
    this.setupScrollButtons();
  }

  /**
   * Search for scroll buttons in the closest common
   * ancestor to this element. If there are buttons, bind
   * the click events to them.
   * If there are no buttons found, do nothing.
   */
  setupScrollButtons() {
    const wrapper = this.closest(".wx-chart-wrapper");
    const left = wrapper.querySelector(
      '.wx-scroll-button[data-direction="left"]',
    );
    const right = wrapper.querySelector(
      '.wx-scroll-button[data-direction="right"]',
    );
    if (!left || !right) {
      return;
    }

    right.addEventListener("click", this.handleScrollRightClick);
    left.addEventListener("click", this.handleScrollLeftClick);
  }

  /**
   * Compute the left side position that we need to scroll
   * to in the container after a rightward click, then scroll to that position.
   */
  handleScrollRightClick(event) {
    const canvas = this.querySelector("canvas");
    const fullWidth = canvas.offsetWidth;
    const shownWidth = this.offsetWidth;
    const remainingWidth = fullWidth - shownWidth - this.scrollLeft;
    const scrollAmount = Math.min(remainingWidth, shownWidth);

    this.scroll(scrollAmount + this.scrollLeft);
  }

  /**
   * Compute the left side position that we need to scroll
   * to in the container after a leftward click, then scroll
   * to that position
   */
  handleScrollLeftClick(event) {
    const shownWidth = this.offsetWidth;
    const scrollPosition = Math.max(0, this.scrollLeft - shownWidth);
    this.scroll(scrollPosition);
  }

  /**
   * Handles actually scrolling the element to the given position.
   * If the element's syncScrolling attribute is "true", then we scroll
   * all other elements with that same attribute set. This has the effect
   * of scrolling all synced charts on the page at the same time.
   */
  scroll(leftPosition) {
    // Scrolling will be synced across all charts if the syncScrolling
    // attribute is set to true.
    const isSynced = this.dataset.syncScrolling === "true";
    if (isSynced) {
      Array.from(
        this.closest("li").querySelectorAll(
          `.wx-chart-wrapper .wx-chart[data-sync-scrolling="true"]`,
        ),
      ).forEach((container) => {
        container.scrollTo({
          left: leftPosition,
          behavior: "smooth",
        });
      });
    } else {
      this.scrollTo({
        left: leftPosition,
        behavior: "smooth",
      });
    }
  }

  /**
   * Draw the chart visual to the underlying canvas.
   * This function is a wrapper around the ChartJS
   * drawing functionality.
   * It will call `getConfig()` on itself (which should be
   * implemented by the individual chart subclasses)
   * in order to get the layout and data config that ChartJS
   * requires to draw a chart.
   */
  drawChart() {
    // Try to locate a canvas child element.
    // Bail with a warning if there isn't one
    const canvas = this.querySelector("canvas");
    if (!canvas) {
      console.warn(
        "Cannot draw chart: no child canvas found for chart element",
        this,
      );
      return;
    }

    // Set the CSS variable for the number of items
    // that will appear in this chart.
    let config;
    try {
      config = this.getConfig();
      const times = JSON.parse(this.dataset.times) || [];
      this.style.setProperty("--chart-datapoint-count", times.length);
    } catch (e) {
      console.warn(
        "Cannot draw chart: could not parse config or time series property",
      );
      return;
    }

    // Draw the actual chart to the canvas
    config.options.devicePixelRatio = 4;
    this._chart = new Chart(canvas, config);
  }

  getConfig() {
    // Subclass responsibility
    throw new Error(
      "This method should only be called on subclasses of WeatherChartElement",
    );
  }
}
