const { test, expect } = require("@playwright/test");

const { describe, beforeEach } = test;

describe("hourly table within the daily forecast", () => {
  beforeEach(async ({ page }) => {
    await page.goto("http://localhost:8081/play/testing");
    await page.goto("/point/38.886/-77.094");
    await page.locator("#daily-tab-button").first().click();
  });

  test("shows hourly expand/collapse button for first two days", async ({
    page,
  }) => {
    const days = await page.locator(".wx-daily-forecast-block li");
    const day1 = days.nth(0);
    const day2 = days.nth(1);

    const hourlyButton1 = day1.locator("wx-hourly-toggle");
    const hourlyButton2 = day2.locator("wx-hourly-toggle");

    await expect(hourlyButton1).toBeVisible();
    await expect(hourlyButton2).toBeVisible();
  });

  test("does NOT show hourly expand/collapse button for days 3+", async ({
    page,
  }) => {
    const days = await page
      .locator(".wx-daily-forecast-block li")
      .all()
      .then((locators) => locators.slice(2));

    for await (const day of days) {
      const hourlyButton = day.locator("wx-hourly-toggle");
      await expect(hourlyButton).not.toBeVisible();
    }
  });
});
