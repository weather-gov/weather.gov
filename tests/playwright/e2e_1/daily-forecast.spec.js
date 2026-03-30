const { test, expect } = require("@playwright/test");
const services = require("../urls.js");

const { describe, beforeEach } = test;

describe.skip("daily forecast", () => {
  beforeEach(async ({ page }) => {
    await page.goto(services.apiProxy("/proxy/play/testing"));
  });

  test("does not display missing day periods", async ({ page }) => {
    await page.goto("/point/21.305/-157.858", { waitUntil: "load" });
    const lastDay = page
      .locator(".wx-daily-forecast-block .wx-daily-forecast-list-item")
      .last();

    const periods = lastDay.locator(".wx-daily-forecast-summary-area");

    await expect(periods).toHaveCount(1);
  });
});
