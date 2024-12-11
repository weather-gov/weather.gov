/* eslint-disable no-await-in-loop, no-plusplus */
const { test, expect } = require("@playwright/test");

const { describe, beforeEach } = test;

describe("quantitative precipitation forecast table", () => {
  beforeEach(async ({ page }) => {
    await page.goto("http://localhost:8081/proxy/play/testing");
    await page.goto("http://localhost:8080/point/34.749/-92.275#daily", { waitUntil: "load"});
  });

  test("shows snow, ice, and water when all are present", async ({ page }) => {
    const day = await page.locator(
      ".wx-daily-forecast-block .wx-daily-forecast-list-item:nth-child(1)",
    );

    const headings = await day.locator(".wx-precip-table thead th");

    // period, snow, ice, [separator], water
    await expect(headings).toHaveCount(5);
    await expect(headings.nth(0)).toHaveText("Time Period");
    await expect(headings.nth(1)).toHaveText("Snow");
    await expect(headings.nth(2)).toHaveText("Ice");
    await expect(headings.nth(4)).toHaveText("Water");
  });

  test("shows snow and water when there is no ice", async ({ page }) => {
    const day = await page.locator(
      ".wx-daily-forecast-block .wx-daily-forecast-list-item:nth-child(2)",
    );

    const headings = await day.locator(".wx-precip-table thead th");

    // period, snow, [separator], water
    await expect(headings).toHaveCount(4);
    await expect(headings.nth(0)).toHaveText("Time Period");
    await expect(headings.nth(1)).toHaveText("Snow");
    await expect(headings.nth(3)).toHaveText("Water");
  });

  test("shows ice and water when there is no snow", async ({ page }) => {
    const day = await page.locator(
      ".wx-daily-forecast-block .wx-daily-forecast-list-item:nth-child(3)",
    );

    const headings = await day.locator(".wx-precip-table thead th");

    // period, ice, [separator], water
    await expect(headings).toHaveCount(4);
    await expect(headings.nth(0)).toHaveText("Time Period");
    await expect(headings.nth(1)).toHaveText("Ice");
    await expect(headings.nth(3)).toHaveText("Water");
  });

  test("shows rain when there is no snow or ice", async ({ page }) => {
    const day = await page.locator(
      ".wx-daily-forecast-block .wx-daily-forecast-list-item:nth-child(4)",
    );

    const headings = await day.locator(".wx-precip-table thead th");

    // period, rain
    await expect(headings).toHaveCount(2);
    await expect(headings.nth(0)).toHaveText("Time Period");
    await expect(headings.nth(1)).toHaveText("Rain");
  });

  test("still shows the table when there is no precipitation forecast", async ({
    page,
  }) => {
    const day = await page.locator(
      ".wx-daily-forecast-block .wx-daily-forecast-list-item:nth-child(5)",
    );

    const headings = await day.locator(".wx-precip-table thead th");

    // period, rain
    await expect(headings).toHaveCount(2);
    await expect(headings.nth(0)).toHaveText("Time Period");
    await expect(headings.nth(1)).toHaveText("Rain");
  });
});
