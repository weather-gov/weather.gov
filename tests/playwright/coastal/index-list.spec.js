const { test, expect } = require("@playwright/test");
const services = require("../urls.js");

const { describe, beforeEach, beforeAll } = test;

describe("Marine Coastal > Index List", () => {
  beforeAll(async ({ request }) => {
    const response = await request.get(
      services.apiProxy("/proxy/play/testing"),
    );
    expect(response.ok()).toBeTruthy();
  });

  beforeEach(async ({ page }) => {
    await page.goto(services.webApp("/forecast/marine/coastal/"), {
      waitUntil: "load",
    });
  });

  describe("Can view the main index page", () => {
    test("I expect the page to load", async ({ page }) => {
      const heading = page.getByRole("heading", {
        level: 1,
        name: "Find Coastal Zone Forecast",
      });
      await expect(heading).toBeVisible();
    });
  });
});
