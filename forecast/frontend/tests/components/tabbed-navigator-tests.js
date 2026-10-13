import { expect } from "chai";

describe("TabbedNavigator browser history", () => {
  const todayUrl = "/forecast/point/38.017/-120.407/today/";
  const dailyUrl = "/forecast/point/38.017/-120.407/7-day/";

  before(async () => {
    await import("../../assets/js/components/TabbedNavigator.js");
  });

  beforeEach(() => {
    window.history.replaceState(null, "", todayUrl);
    document.body.innerHTML = `
      <wx-tabbed-nav>
        <div role="tablist">
          <button role="tab" class="tab-button" data-tab-name="today"
            data-url="${todayUrl}" data-selected="true">Today</button>
          <button role="tab" class="tab-button" data-tab-name="daily"
            data-url="${dailyUrl}">7-Day</button>
        </div>
        <div id="today" class="wx-tab-container" data-selected="true"></div>
        <div id="daily" class="wx-tab-container"></div>
      </wx-tabbed-nav>
    `;
  });

  it("restores the matching tab when navigating back", async () => {
    const todayTab = document.querySelector('[data-tab-name="today"]');
    const dailyTab = document.querySelector('[data-tab-name="daily"]');

    dailyTab.click();
    expect(window.location.pathname).to.equal(dailyUrl);
    expect(dailyTab.hasAttribute("data-selected")).to.be.true;

    const backNavigation = new Promise((resolve) => {
      window.addEventListener("popstate", resolve, { once: true });
    });
    window.history.back();
    await backNavigation;

    expect(window.location.pathname).to.equal(todayUrl);
    expect(todayTab.hasAttribute("data-selected")).to.be.true;
    expect(dailyTab.hasAttribute("data-selected")).to.be.false;
    expect(document.activeElement).to.equal(todayTab);
  });
});
