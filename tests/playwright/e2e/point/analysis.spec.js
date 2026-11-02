const { test, expect } = require("@playwright/test");
const services = require("../../urls.js");

const { describe, beforeEach, beforeAll } = test;

describe("Point forecast › Analysis tab", () => {
  beforeAll(async ({ request }) => {
    const response = await request.get(
      services.apiProxy("/proxy/play/testing"),
    );
    expect(response.ok()).toBeTruthy();
  });

  beforeEach(async ({ page }) => {
    await page.goto(
      services.webApp("/forecast/point/34.749/-92.275/analysis"),
      {
        waitUntil: "load",
      },
    );
  });

  describe("When viewing the analysis tab", () => {
    test("I do not expect to see marine alerts", async ({ page }) => {
      await page.goto(
        services.webApp("/forecast/point/33.521/-86.812/analysis"),
        {
          waitUntil: "load",
        },
      );
      const alerts = page.getByRole("alert");

      await expect(alerts).toHaveCount(1);
      await expect(alerts).toContainText("Wind Advisory");
      await expect(alerts).not.toContainText("Small Craft Advisory");
    });

    test("I expect to see alerts based on fire zone", async ({ page }) => {
      const link = page.getByRole("link", { name: "Red Flag Warning" });
      await expect(link).toBeVisible();
    });

    test("I do not expect to see any error messages", async ({ page }) => {
      await expect(page.locator(".usa-alert--error")).toHaveCount(0);
    });

    test("I expect to see a weather story and relevant wfo links", async ({
      page,
    }) => {
      await page.goto(
        services.webApp("/forecast/point/33.211/-87.566/analysis"),
        {
          waitUntil: "load",
        },
      );
      expect(
        page.getByRole("heading", { name: /From the Forecaster/i }),
      ).toBeVisible();
      expect(page.getByRole("link", { name: /WFO/i })).toBeVisible();
      const countyLink = page.getByRole("link", {
        name: /Tuscaloosa County, AL/i,
      });
      await expect(countyLink).toBeVisible();
      await expect(countyLink).toHaveAttribute(
        "href",
        /\/forecast\/county\/01125/i,
      );
      expect(
        page.getByRole("link", {
          name: /Birmingham Area Forecast Discussion/i,
        }),
      ).toBeVisible();
    });
  });

  describe("When there are non-critical-component errors", () => {
    test("I expect to see error components", async ({ page }) => {
      await page.goto(
        services.webApp("/forecast/point/64.837/-147.739/analysis"),
        {
          waitUntil: "load",
        },
      );
      const nonCriticalErrors = page.locator(".non-critical-component-error");
      const wxStoryContainer = page.locator(".wx-weather-story-block-section");

      await expect(nonCriticalErrors).toHaveCount(1);
      await expect(wxStoryContainer).toContainText(
        /There was an error loading weather stories/,
      );
    });
  });
});
