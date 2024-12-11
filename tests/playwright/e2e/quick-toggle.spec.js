const { test, expect } = require("@playwright/test");

const { describe, beforeEach } = test;

beforeEach(async ({page}) => {
  await page.goto("http://localhost:8081/proxy/play/testing");
  await page.goto("/point/34.749/-92.275", { waitUntil: "load"});
  await page.locator("#daily-tab-button").click();
  await page.locator('.wx-quick-forecast[role="tablist"]').waitFor();
  const currentHeight = page.viewportSize().height;
  await page.setViewportSize({
    width: 700,
    height: currentHeight
  });
});

describe("Quick Toggle tests", () => {
  test("The Quick Forecast is hidden", async ({page}) => {
    const quickForecast = await page.locator(".wx-quick-forecast");

    expect(quickForecast).not.toBeVisible();
  });

  test("Clicking a quick toggle item shows its accordion daily forecast item content (and clicking agan hides it)", async ({page}) => {
    const toggleButton = await page.locator(
      ".wx-daily-forecast-list-item:nth-child(2) .wx-quick-toggle-item"
    );
    const target = await toggleButton.getAttribute("aria-controls");
    // We have to use force: true here because
    // playwright doesn't like when click events are handled by parent elements
    await toggleButton.click({force: true}); 
    const accordionContent = await page.locator(`#${target}`);

    expect(accordionContent).toBeVisible();

    await toggleButton.click({force: true});

    expect(accordionContent).not.toBeVisible();
  });
});

