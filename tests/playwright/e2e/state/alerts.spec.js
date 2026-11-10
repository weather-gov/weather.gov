const { test, expect } = require("@playwright/test");
const services = require("../../urls.js");

const { describe, afterAll, beforeAll, beforeEach } = test;

describe("State > Alerts tab", () => {
  beforeAll(async ({ request }) => {
    const response = await request.get(
      services.apiProxy("/proxy/play/testing"),
    );
    expect(response.ok()).toBeTruthy();
  });
  beforeEach(async ({ page }) => {
    await page.goto(services.apiProxy("/proxy/play/testing"));
    await page.goto("/forecast/state/AR", { waitUntil: "load" });
  });
  afterAll(async ({ request }) => {
    const response = await request.get(services.apiProxy("/proxy/play/stop"));
    expect(response.ok()).toBeTruthy();
  });

  describe("When viewing state page with active alerts", () => {
    test("I expect tho see the alerts tab is selected", async ({ page }) => {
      const tabAlert = page.getByRole("link", { name: "Alerts" });
      await expect(tabAlert).toHaveAttribute("data-selected");
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
        name: `Zoom in state alert map`,
      });
      expect(mapZoomIn).toHaveAttribute(
        "aria-label",
        "Zoom in state alert map",
      );
      const mapZoomOut = page.getByRole("button", {
        name: "Zoom out state alert map",
      });
      expect(mapZoomOut).toHaveAttribute(
        "aria-label",
        "Zoom out state alert map",
      );
      const mapExpand = page.getByRole("button", {
        name: "Expand state alert map to full-screen width",
      });
      expect(mapExpand).toHaveAttribute(
        "aria-label",
        "Expand state alert map to full-screen width",
      );

      await mapExpand.click();
      const mapCollapse = page.getByRole("button", {
        name: "Collapse state alert map to original size",
      });
      expect(mapCollapse).toHaveAttribute(
        "aria-label",
        "Collapse state alert map to original size",
      );
    });
  });
});
