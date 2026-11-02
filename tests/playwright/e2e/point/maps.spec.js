const { test, expect } = require("@playwright/test");
const services = require("../../urls.js");

const { describe, beforeEach, beforeAll } = test;

describe("Point forecast › Maps tab", () => {
  beforeAll(async ({ request }) => {
    const response = await request.get(
      services.apiProxy("/proxy/play/testing"),
    );
    expect(response.ok()).toBeTruthy();
  });

  beforeEach(async ({ page }) => {
    await page.goto(services.webApp("/forecast/point/34.749/-92.275/maps"), {
      waitUntil: "load",
    });
  });

  describe("When viewing the maps tab", () => {
    test("I do not expect to see any error messages", async ({ page }) => {
      await expect(page.locator(".usa-alert--error")).toHaveCount(0);
    });

    describe("I expect to see my radar", async () => {
      test("I can to see my radar information", async ({ page }) => {
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
          /\w+, \d+:\d+ (AM|PM) [A-Z]{3,4} (–|-) \d+:\d+ (AM|PM) [A-Z]{3,4}/i,
          { useInnerText: true },
        );
        await expect(container).toBeVisible();
      });

      test("I expect to see the intensity key in the radar legend", async ({
        page,
      }) => {
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

      test("I can access my radar link", async ({ page }) => {
        const container = page.locator("div.wx-radar-wrapper");
        const link = container.getByText("Explore other radar views");
        await expect(link).toBeVisible();
        await expect(link).toHaveAttribute("href", /radar\.weather\.gov/i);
      });
    });

    describe("I expect to see my satellite", () => {
      test("I can see my satellite information", async ({ page }) => {
        const heading = page.getByRole("heading", {
          name: "Satellite",
          exact: true,
          includeHidden: true,
        });
        const container = page.locator("div.wx-satellite-wrapper");
        const timeTitle = container.getByText("time shown:");
        const time = page.locator("div[data-wx-satellite-times]");

        await expect(heading).toBeVisible();
        await expect(timeTitle).toBeVisible();
        await expect(time).toContainText(/\w+, \d+:\d+ (AM|PM) [A-Z]{3,4}/i, {
          useInnerText: true,
        });
        await expect(container).toBeVisible();
      });

      test("I can access my satellite link", async ({ page }) => {
        const container = page.locator("div.wx-satellite-wrapper");
        const link = container.getByText("Explore other satellite views");
        await expect(link).toBeVisible();
        await expect(link).toHaveAttribute(
          "href",
          /goes\.noaa\.gov\/wfo\.php/i,
        );
      });

      test("I can access my satellite link for Alaska", async ({ page }) => {
        await page.goto(
          services.webApp("/forecast/point/59.284/-158.63/maps"),
          {
            waitUntil: "load",
          },
        );
        const container = page.locator("div.wx-satellite-wrapper");
        const link = container.getByText("Explore other satellite views");
        await expect(link).toBeVisible();
        await expect(link).toHaveAttribute(
          "href",
          /goes\.noaa\.gov\/sector\.php/i,
        );
      });
    });

    describe("When I click to explore other views", () => {
      test("I expect to be taken to radar.weather.gov", async ({ page }) => {
        const link = page.getByRole("link", {
          name: "Explore other radar views",
          includeHidden: true,
        });
        const linkHref = await link.getAttribute("href");
        expect(
          linkHref.startsWith("https://radar.weather.gov/?settings=v1_"),
        ).toBeTruthy();
      });
    });
  });

  describe("When there are non-critical-component errors", () => {
    test("I expect to see error components", async ({ page }) => {
      // Guam does not have satellite views available
      await page.goto(services.webApp("/forecast/point/13.484/144.797/maps"), {
        waitUntil: "load",
      });
      const nonCriticalErrors = page.locator(".non-critical-component-error");
      // Radar error container should be present but hidden
      const hiddenNonCriticalError = page.locator(
        "#wx-radar-error-container.display-none",
      );

      const satError = page.locator("div[data-wx-satellite-error]");
      const satContainer = page.locator("div[wx-outer-satellite-container]");

      await expect(nonCriticalErrors).toHaveCount(2);
      await expect(hiddenNonCriticalError).toHaveCount(1);
      await expect(satContainer).toHaveClass(/display-none/);
      await expect(satError).toContainText(
        /There was an error loading the satellite/,
      );
    });
  });
});
