const { test, expect } = require("@playwright/test");
const services = require("../../urls.js");

const { describe, afterAll, beforeAll, beforeEach } = test;

describe("Point > Alerts tab", () => {
  beforeAll(async ({ request }) => {
    const response = await request.get(
      services.apiProxy("/proxy/play/testing"),
    );
    expect(response.ok()).toBeTruthy();
  });
  beforeEach(async ({ page }) => {
    await page.goto(services.apiProxy("/proxy/play/testing"));
    await page.goto("/forecast/point/34.749/-92.275", { waitUntil: "load" });
  });
  afterAll(async ({ request }) => {
    const response = await request.get(services.apiProxy("/proxy/play/stop"));
    expect(response.ok()).toBeTruthy();
  });

  describe("When viewing point page with active alerts", () => {
    test("I expect tho see the alerts tab is selected", async ({ page }) => {
      const tabAlert = page.getByRole("tab", { name: "Alerts" });
      await expect(tabAlert).toHaveAttribute("data-selected", "true");
    });
  });

  describe("When viewing alerts maps", () => {
    test("I expect multiple alert maps are displayed", async ({ page }) => {
      const alertBanners = page.getByRole("alert");
      const alertMaps = page.locator("wx-alert-map");
      expect(await alertMaps.count()).toEqual(await alertBanners.count());
    });
    test("I expect each alert accordion has a map", async ({ page }) => {
      const alertAccordions = page.locator(
        "wx-alerts div[class*='alert-level__']",
      );
      const alertAccordionsWithMap = alertAccordions.filter({
        has: page.getByRole("region", { name: "Map" }),
      });
      expect(await alertAccordions.count()).toEqual(
        await alertAccordionsWithMap.count(),
      );
    });
    test("I expect that each alerts map has the correct control title and aria-label", async ({
      page,
    }) => {
      const alertAreas = page.locator("wx-alerts");
      for (const alertArea of await alertAreas.all()) {
        const alertHeading = alertArea
          .getByRole("heading", { level: 3 })
          .first();
        const accordionText = (await alertHeading.innerText()).toLowerCase();
        const mapZoomIn = alertArea.getByRole("button", {
          name: `Zoom in ${accordionText} map`,
        });
        expect(mapZoomIn).toHaveAttribute(
          "aria-label",
          `Zoom in ${accordionText} map`,
        );
        const mapZoomOut = alertArea.getByRole("button", {
          name: `Zoom out ${accordionText} map`,
        });
        expect(mapZoomOut).toHaveAttribute(
          "aria-label",
          `Zoom out ${accordionText} map`,
        );
      }
    });
  });
});
