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
    await page.goto(services.webApp("/forecast/point/34.749/-92.275/#today"), {
      waitUntil: "load",
    });
    const djdt = page.getByRole("link", { name: "Hide »" });
    if (await djdt.isVisible()) {
      await djdt.click(); // click to hide the overlay on dev
    }
  });

  describe("When viewing today's forecast", () => {
    test("I do not expect to see marine alerts", async ({ page }) => {
      await page.goto(services.webApp("/forecast/point/33.521/-86.812/"), {
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

    test("I expect to see N/A when there is no wind data", async ({ page }) => {
      await page.goto(services.webApp("/forecast/point/33.211/-87.566/"), {
        waitUntil: "load",
      });
      const row = page.getByRole("rowheader", { name: "WIND" });
      const wind = row.locator("//following-sibling::td");

      await expect(wind).toContainText("N/A");
    });

    test("I expect to see my radar", async ({ page }) => {
      const heading = page.getByRole("heading", {
        name: "Radar",
        exact: true,
        includeHidden: true,
      });
      const container = page.locator("div.cmi-radar-container");
      const time = page.locator('div[wx-auto-update="radar"]');

      await expect(heading).toBeVisible();
      await expect(time).toHaveText(/Time shown/i, { useInnerText: true });
      await expect(time).toHaveText(
        /\w+, \d+:\d+ (AM|PM) UTC - \d+:\d+ (AM|PM) UTC/i,
        { useInnerText: true },
      );
      await expect(container).toBeVisible();
    });

    describe("When I toggle the radar legend", () => {
      test("I expect to see the intensity key", async ({ page }) => {
        const button = page.getByRole("button", {
          name: "Radar Legend",
          includeHidden: true,
        });
        await button.focus();
        page.keyboard.press("Space");

        const table = page.locator("table#radar-legend");
        const row = table.getByRole("row", { includeHidden: true }).nth(1);
        await expect(row).toHaveText(/−35–0/i);
        await expect(row).toHaveText(/Extremely light \(drizzle\/snow\)/i);
      });
    });

    describe("When I click to explore other views", () => {
      test("I expect to be taken to radar.weather.gov", async ({ page }) => {
        const link = page.getByRole("link", {
          name: "Explore other radar views",
          includeHidden: true,
        });
        expect(link).toHaveAttribute(
          "href",
          "https://radar.weather.gov/?settings=v1_",
        );
      });
    });
  });

  describe("When there are non-critical-component errors", () => {
    test("I expect to see error components", async ({ page }) => {
      await page.goto(services.webApp("/forecast/point/64.837/-147.739/"), {
        waitUntil: "load",
      });
      const nonCriticalErrors = page.locator(".non-critical-component-error");
      // Radar error container should be present but hidden
      const hiddenNonCriticalError = page.locator(
        "#wx-radar-error-container.display-none",
      );
      const obsErrorContainer = page.locator(
        "#wx-current-conditions-error-container",
      );
      const satError = page.locator("div[data-wx-satellite-error]");
      const satContainer = page.locator("div[wx-outer-satellite-container]");
      const wxStoryContainer = page.locator(".wx-weather-story-block-section");

      await expect(nonCriticalErrors).toHaveCount(4);
      await expect(hiddenNonCriticalError).toHaveCount(1);
      await expect(satContainer).toHaveClass(/display-none/);
      await expect(satError).toContainText(
        /There was an error loading the Satellite/,
      );
      await expect(wxStoryContainer).toContainText(
        /There was an error loading weather stories/,
      );
      await expect(obsErrorContainer).toContainText(
        /There was an error loading current conditions/,
      );
    });
  });

  describe("Sunrise/sunset fallbacks", () => {
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
      await page.goto(services.webApp("/forecast/point/69.519/-157.105/"), {
        waitUntil: "load",
      });
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
      await page.goto(services.webApp("/forecast/point/64.837/-147.739/"), {
        waitUntil: "load",
      });

      await page.getByRole("button", { name: "show more" }).click();

      const row = page.getByRole("rowheader", { name: "first light" });
      const firstLight = row.locator("//following-sibling::td");

      await expect(firstLight).toContainText("N/A");
    });
  });
});
