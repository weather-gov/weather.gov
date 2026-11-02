const { test, expect } = require("@playwright/test");
const services = require("../../urls.js");

const { describe, beforeEach, beforeAll } = test;

describe("Point forecast › Today tab", () => {
  beforeAll(async ({ request }) => {
    const response = await request.get(
      services.apiProxy("/proxy/play/testing"),
    );
    expect(response.ok()).toBeTruthy();
  });

  beforeEach(async ({ page }) => {
    await page.goto(services.webApp("/forecast/point/34.749/-92.275/today"), {
      waitUntil: "load",
    });
  });

  describe("When viewing today's forecast", () => {
    test("I do not expect to see marine alerts", async ({ page }) => {
      await page.goto(services.webApp("/forecast/point/33.521/-86.812/today"), {
        waitUntil: "load",
      });
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

    test("I expect to see temperature, wind, and precipitation weather data", async ({
      page,
    }) => {
      await page.goto(services.webApp("/forecast/point/33.211/-87.566/today"), {
        waitUntil: "load",
      });
      expect(
        page.getByRole("heading", { name: /Current Conditions/i }),
      ).toBeVisible();
      expect(
        page.getByRole("heading", { name: /Today's Forecast/i }),
      ).toBeVisible();

      const dailyForecastSummary = page.locator(
        "div.wx-daily-forecast-summary-area",
      );
      await expect(dailyForecastSummary).toHaveCount(2);

      const tempChart = page.locator("wx-temp-chart");
      await expect(tempChart).toBeVisible();

      const windChart = page.locator("wx-wind-chart");
      await expect(windChart).toBeVisible();

      const precipChart = page.locator("wx-pops-chart");
      await expect(precipChart).toBeVisible();

      // Check for a11y sr-only tables
      const tempColumn = page.getByRole("columnheader", {
        name: "Temperature",
      });
      const temp = tempColumn.locator("//following-sibling::td");
      const windColumn = page.getByRole("columnheader", { name: "Wind speed" });
      const wind = windColumn.locator("//following-sibling::td");
      const precipColumn = page.getByRole("columnheader", {
        name: "Chance of Precipitation",
      });
      const precip = precipColumn.locator("//following-sibling::td");

      await expect(temp).toBeHidden();
      await expect(wind).toBeHidden();
      await expect(precip).toBeHidden();
    });

    test("I expect to see N/A when there is no wind data", async ({ page }) => {
      await page.goto(services.webApp("/forecast/point/33.211/-87.566/today"), {
        waitUntil: "load",
      });
      const row = page.getByRole("rowheader", { name: "WIND" });
      const wind = row.locator("//following-sibling::td");

      await expect(wind).toContainText("N/A");
    });
  });

  describe("When there are non-critical-component errors", () => {
    test("I expect to see error components", async ({ page }) => {
      await page.goto(
        services.webApp("/forecast/point/64.837/-147.739/today"),
        {
          waitUntil: "load",
        },
      );
      const nonCriticalErrors = page.locator(".non-critical-component-error");
      const obsErrorContainer = page.locator(
        "#wx-current-conditions-error-container",
      );

      await expect(nonCriticalErrors).toHaveCount(1);
      await expect(obsErrorContainer).toContainText(
        /There was an error loading current conditions/,
      );
    });
  });

  // This is currently failing due to suntimes no longer coming from the actual point endpoint
  // The override isn't working for either forcing the lookup or suncalc :(
  describe.skip("Sunrise/sunset fallbacks", () => {
    beforeEach(() => {
      // For use with point endpoint
      process.env.INTERNAL_GRIDPOINT_LOOKUP = "false";
    });

    test("I expect to see a missing suntimes message for midnight sun", async ({
      page,
    }) => {
      // Force suncalc to return a date within midnight sun conditions
      await page.clock.setFixedTime(new Date("2025-06-01T13:39:00"));
      // Barrow, AK
      await page.goto(
        services.webApp("/forecast/point/69.519/-157.105/today"),
        {
          waitUntil: "load",
        },
      );
      const sunriseContainer = page.locator(".wx-sunrise-sunset-container");

      await expect(sunriseContainer).toHaveCount(1);
      await expect(sunriseContainer).toContainText(
        "Currently there are no sunrise or sunset times",
      );
    });

    test("I expect to see N/A when there is missing suntimes data", async ({
      page,
    }) => {
      // Force suncalc to return a date within midnight sun conditions
      await page.clock.setFixedTime(new Date("2025-06-01T13:39:00"));
      // Fairbanks, AK
      await page.goto(
        services.webApp("/forecast/point/64.837/-147.739/today"),
        {
          waitUntil: "load",
        },
      );

      await page.getByRole("button", { name: "show more" }).click();

      const row = page.getByRole("rowheader", { name: "first light" });
      const firstLight = row.locator("//following-sibling::td");

      await expect(firstLight).toContainText("N/A");
    });
  });
});
