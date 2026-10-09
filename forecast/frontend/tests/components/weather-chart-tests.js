import { expect } from "chai";
import { createSandbox, spy } from "sinon";

describe("Weather chart scroll controls", () => {
  let sandbox;
  let chart;
  let controls;
  let observer;
  let resizeCallback;
  let originalResizeObserver;
  let visibleWidth;
  let contentWidth;

  before(async () => {
    const originalChart = global.Chart;
    const originalChartDataLabels = global.ChartDataLabels;
    global.Chart = {
      register() {},
      defaults: { plugins: { tooltip: {} } },
    };
    global.ChartDataLabels = {};
    try {
      const { WeatherChartElement } = await import(
        "../../assets/js/charts/WeatherChart.js"
      );
      window.customElements.define("wx-test-chart", WeatherChartElement);
    } finally {
      global.Chart = originalChart;
      global.ChartDataLabels = originalChartDataLabels;
    }
  });

  beforeEach(() => {
    sandbox = createSandbox();
    originalResizeObserver = global.ResizeObserver;
    global.ResizeObserver = class {
      constructor(callback) {
        resizeCallback = callback;
        this.observe = spy();
        this.disconnect = spy();
        observer = this;
      }
    };
    visibleWidth = 400;
    contentWidth = 400;
    const wrapper = document.createElement("div");
    wrapper.className = "wx-chart-wrapper";
    wrapper.innerHTML = `
      <div class="wx-chart-scroll-controls display-flex">
        <div><button class="wx-scroll-button" data-direction="left"></button></div>
        <div><button class="wx-scroll-button" data-direction="right"></button></div>
      </div>
      <wx-test-chart><div class="wx-chart-inner"><canvas></canvas></div></wx-test-chart>
    `;
    chart = wrapper.querySelector("wx-test-chart");
    controls = wrapper.querySelector(".wx-chart-scroll-controls");
    sandbox.stub(chart, "clientWidth").get(() => visibleWidth);
    sandbox.stub(chart, "scrollWidth").get(() => contentWidth);
    document.body.append(wrapper);
  });

  afterEach(() => {
    document.body.replaceChildren();
    sandbox.restore();
    global.ResizeObserver = originalResizeObserver;
  });

  it("hides the entire controls row when all data fits", () => {
    expect(controls.classList.contains("display-none")).to.equal(true);
    expect(controls.classList.contains("display-flex")).to.equal(false);
  });

  it("shows controls when content overflows, even on wide screens", () => {
    visibleWidth = 1200;
    contentWidth = 1400;
    resizeCallback();
    expect(controls.classList.contains("display-none")).to.equal(false);
    expect(controls.classList.contains("display-flex")).to.equal(true);
  });

  it("updates visibility in both directions as the viewport resizes", () => {
    visibleWidth = 300;
    resizeCallback();
    expect(controls.classList.contains("display-flex")).to.equal(true);
    visibleWidth = 500;
    resizeCallback();
    expect(controls.classList.contains("display-none")).to.equal(true);
  });

  it("observes both the chart viewport and its content", () => {
    expect(observer.observe.calledWith(chart)).to.equal(true);
    expect(
      observer.observe.calledWith(chart.querySelector(".wx-chart-inner")),
    ).to.equal(true);
    contentWidth = 600;
    resizeCallback();
    expect(controls.classList.contains("display-flex")).to.equal(true);
  });

  it("rechecks overflow when a hidden tab becomes visible", () => {
    visibleWidth = 0;
    contentWidth = 600;
    resizeCallback();
    expect(controls.classList.contains("display-none")).to.equal(true);
    visibleWidth = 400;
    resizeCallback();
    expect(controls.classList.contains("display-flex")).to.equal(true);
  });

  it("disconnects the observer and removes click handlers on removal", () => {
    const scroll = sandbox.stub(chart, "scroll");
    chart.remove();
    expect(observer.disconnect.calledOnce).to.equal(true);
    controls.querySelector('[data-direction="left"]').click();
    expect(scroll.called).to.equal(false);
  });

  it("restores observation and click handlers when reconnected", () => {
    const wrapper = chart.parentElement;
    const scroll = sandbox.stub(chart, "scroll");
    chart.remove();
    wrapper.append(chart);
    expect(observer.observe.calledWith(chart)).to.equal(true);
    controls.querySelector('[data-direction="left"]').click();
    expect(scroll.calledOnce).to.equal(true);
  });
});
