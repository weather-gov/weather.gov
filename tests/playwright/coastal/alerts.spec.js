const { test, expect } = require("@playwright/test");
const services = require("../urls.js");

const { describe, beforeEach, beforeAll } = test;

describe("Marine Coastal > Zone > Alerts", () => {
  beforeAll(async ({ request }) => {
    const response = await request.get(
      services.apiProxy("/proxy/play/testing"),
    );
    expect(response.ok()).toBeTruthy();
  });

  beforeEach(async ({ page }) => {
    await page.goto(
      services.webApp("/forecast/marine/coastal/PHZ117/alerts/"),
      {
        waitUntil: "load",
      },
    );
  });

  describe("Navigation tabs", () => {
    test("Can view the tabs", async ({ page }) => {
      const tabs = page.getByLabel("Weather information sections");
      await expect(tabs).toBeVisible();
      const alert_tab = page.getByRole("link", { name: "Alerts" });
      expect(alert_tab).toBeVisible();
      expect(alert_tab).toHaveAttribute("data-selected");
      expect(page.getByRole("link", { name: "Forecast" })).toBeVisible();
      expect(page.getByRole("link", { name: "Conditions" })).toBeVisible();
    });
  });

  describe("Can view the zone alerts page", () => {
    test("I expect the page to load", async ({ page }) => {
      const place = page.getByRole("heading", {
        level: 1,
      });
      const heading = page.getByRole("heading", {
        level: 2,
        name: "Alerts",
      });
      await expect(heading).toBeVisible();
    });
  });
});
