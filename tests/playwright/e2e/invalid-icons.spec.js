const { test, expect } = require("@playwright/test");

const { describe, beforeEach } = test;

describe("Invalid icon URL tests", () => {
  beforeEach(async ({ page }) => {
    await page.goto("http://localhost:8081/proxy/play/testing");
    await page.goto("/point/38.886/-77.094", { waitUntil: "load"});
  });

  test("Doesn't render icon for unknown icon name (current conditions)", async ({
    page,
  }) => {
    const count = await page.locator("#today .wx-icon").count();
    expect(count).toEqual(0);
  });

  test("Doesn't render icon for first day condition in daily (unknown icon name)", async ({
    page,
  }) => {
    const count = await page
      .locator(
        "#daily .wx-daily-forecast-block ol li:first-child .wx-daily-forecast-summary-area:first-child svg",
      )
      .count();
    expect(count).toEqual(0);
  });

  test("Doesn't render icon for third night condition in daily (invalid icon url)", async ({
    page,
  }) => {
    const count = await page
      .locator(
        "#daily .wx-daily-forecast-block ol li:nth-child(3) .wx-daily-forecast-summary-area:nth-child(2) svg",
      )
      .count();
    expect(count).toEqual(0);
  });

  test("Doesn't render icon for second day condition in daily (icon value is null)", async ({
    page,
  }) => {
    const count = await page
      .locator(
        "#daily .wx-daily-forecast-block ol li:nth-child(2) .wx-daily-forecast-summary-area:first-child svg",
      )
      .count();
    expect(count).toEqual(0);
  });

  test("Does render icon for second night condition in daily", async ({
    page,
  }) => {
    const count = await page
      .locator(
        "#daily .wx-daily-forecast-block ol li:nth-child(2) .wx-daily-forecast-summary-area:nth-child(2) svg",
      )
      .count();
    expect(count).toEqual(1);
  });
});

describe("Valid icon rendering double-checks", () => {
  beforeEach(async ({ page }) => {
    await page.goto("http://localhost:8081/proxy/play/testing");
    await page.goto("/point/34.749/-92.275", { waitUntil: "load"});
  });

  test("Should render an icon in the current conditions", async ({ page }) => {
    const count = await page
      .locator("#today .wx-current-conditions .wx-icon > svg")
      .count();
    expect(count).toEqual(1);
  });
});
