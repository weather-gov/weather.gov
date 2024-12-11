const { test, expect } = require("@playwright/test");

const { describe } = test;

describe("location search", () => {
  test("properly handles browser history", async ({ page }) => {
    const start = "/point/36.168/-86.778";

    await page.goto("http://localhost:8081/stop");
    await page.goto(start, { waitUntil: "load"});

    // Clear out saved results for simplicity's sake
    await page.evaluate(() => {
      window.localStorage.clear();
    });

    await page
      .locator(`form[data-location-search] input[type="text"]`)
      .fill("Atlanta");

    await page
      .locator(`form[data-location-search] ul li[role="option"]`)
      .first()
      .click();

    // Wait for the page, because the click() method only waits for navigation
    // to begin, which happens before the page location changes.
    await page.waitForEvent("load");

    await expect(new URL(await page.url()).pathname).not.toEqual(start);

    // The goBack() method, however, waits until the navigation is finished.
    await page.goBack();
    await expect(new URL(await page.url()).pathname).toEqual(start);
  });
});
