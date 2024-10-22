const { test, expect } = require("@playwright/test");

const { describe, beforeEach } = test;

describe("hourly table within the daily forecast", () => {
  beforeEach(async ({ page }) => {
    await page.goto("http://localhost:8081/play/testing");
    await page.goto("/point/38.886/-77.094");
    await page.locator("#daily-tab-button").first().click();
  });

  test("shows hourly expand/collapse button", async ({ page }) => {
    const days = await page.locator(".wx-daily-forecast-block .wx-daily-forecast-list-item").all();

    for await (const day of days) {
      const hourlyButton = day.locator("wx-hourly-toggle");
      await expect(hourlyButton).toBeVisible();
    }
  });
});
