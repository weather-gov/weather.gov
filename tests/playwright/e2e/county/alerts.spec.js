const { test, expect } = require("@playwright/test");
const services = require("../../urls.js");

const { describe, beforeAll, beforeEach, afterAll } = test;

describe("County > Alerts region", () => {
  beforeAll(async ({ request }) => {
    const response = await request.get(
      services.apiProxy("/proxy/play/testing"),
    );
    expect(response.ok()).toBeTruthy();
  });
  beforeEach(async ({ page }) => {
    await page.goto("/forecast/county/05119", { waitUntil: "load" });
  });
  afterAll(async ({ request }) => {
    const response = await request.get(services.apiProxy("/proxy/play/stop"));
    expect(response.ok()).toBeTruthy();
  });

  describe("When viewing county page with active alerts", () => {
    test("I expect to see the alert day tab region", async ({ page }) => {
      const tabDays = page.locator("#county-alerts");
      await expect(tabDays).toBeVisible();
    });
    test("I expect to see the All days tab selected", async ({ page }) => {
      const allDaysTab = page.getByRole("tab", { name: "All days" });
      await expect(allDaysTab).toHaveAttribute("aria-selected", "true");
    });
  });

  describe("When viewing alerts map", () => {
    test("I expect multiple the alert map is displayed", async ({ page }) => {
      const alertMaps = page.locator("wx-alert-map");
      expect(await alertMaps.count()).toEqual(1);
    });
    test("I expect the alert map has the correct control title and aria-label", async ({
      page,
    }) => {
      const mapZoomIn = page.getByRole("button", {
        name: `Zoom in county alert map`,
      });
      expect(mapZoomIn).toHaveAttribute(
        "aria-label",
        "Zoom in county alert map",
      );
      const mapZoomOut = page.getByRole("button", {
        name: "Zoom out county alert map",
      });
      expect(mapZoomOut).toHaveAttribute(
        "aria-label",
        "Zoom out county alert map",
      );
      const mapExpand = page.getByRole("button", {
        name: "Expand county alert map to full-screen width",
      });
      expect(mapExpand).toHaveAttribute(
        "aria-label",
        "Expand county alert map to full-screen width",
      );

      await mapExpand.click();
      const mapCollapse = page.getByRole("button", {
        name: "Collapse county alert map to original size",
      });
      expect(mapCollapse).toHaveAttribute(
        "aria-label",
        "Collapse county alert map to original size",
      );
    });
  });
});
