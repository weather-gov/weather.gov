/* eslint-disable no-await-in-loop, no-plusplus */
const { test, expect } = require("@playwright/test");

const { describe, beforeEach } = test;

describe("the location page", () => {
  beforeEach(async ({ page }) => {
    await page.goto("http://localhost:8081/proxy/play/testing");
  });

  test("does not display marine alerts", async ({ page }) => {
    await page.goto("/point/33.521/-86.812", { waitUntil: "load"});
    const alertEl = page.locator("weathergov-alert-list > div");

    await expect(alertEl).toHaveCount(1);
    await expect(alertEl).toContainText("Wind Advisory");
    await expect(alertEl).not.toContainText("Small Craft Advisory");
  });

  test("does include alerts based on fire zone", async ({ page }) => {
    await page.goto("/point/34.749/-92.275", { waitUntil: "load"});
    const alertEl = page.locator("weathergov-alert-list > div");

    await expect(alertEl).toContainText("Red Flag Warning");
  });

  describe("shows n/a for unavailable data", () => {
    test("wind is null", async ({ page }) => {
      await page.goto("/point/33.211/-87.566", { waitUntil: "load"});
      const windEl = page.locator(".wx-current-conditions .wx-wind-speed > td");

      await expect(windEl).toContainText("N/A");
    });
  });

  describe("Radar component loading tests", () => {
    test("does not kload if the today tab is not displaying", async ({
      page,
    }) => {
      await page.goto("/point/33.521/-86.812", { waitUntil: "load"});
      const radarContainer = page.locator("#wx_radar_container");

      await expect(radarContainer).toBeEmpty();
    });

    test("loads correctly after switching to the today tab", async ({
      page,
    }) => {
      await page.goto("/point/33.521/-86.812", { waitUntil: "load"});
      const currentTab = page.locator('[data-tab-name="today"]');
      const radarContainer = page.locator("#wx_radar_container");

      await currentTab.click();

      await expect(radarContainer).not.toBeVisible();
      await page.pause();
    });
  });

  describe("Page load error messages", () => {
    test("should load the default tabbed view without any error messages", async ({
      page,
    }) => {
      await page.goto("/point/34.749/-92.275", { waitUntil: "load"});
      const errorEl = page.locator(".usa-alert--error");

      await expect(errorEl).toHaveCount(0);
    });

    test("should load without any error messages in the today tab", async ({
      page,
    }) => {
      await page.goto("/point/34.749/-92.275#today", { waitUntil: "load"});
      const errorEl = page.locator(".usa-alert--error");

      await expect(errorEl).toHaveCount(0);
    });

    test("should load without any error messages in the daily (7-day) tab", async ({
      page,
    }) => {
      await page.goto("/point/34.749/-92.275#daily", { waitUntil: "load"});
      const errorEl = page.locator(".usa-alert--error");

      await expect(errorEl).toHaveCount(0);
    });

    test("should load without any error messages in the current conditions tab", async ({
      page,
    }) => {
      await page.goto("/point/34.749/-92.275#today", { waitUntil: "load"});
      const errorEl = page.locator(".usa-alert--error");

      await expect(errorEl).toHaveCount(0);
    });
  });
});
