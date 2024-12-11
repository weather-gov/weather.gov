const { test, expect } = require("@playwright/test");

const { describe, beforeEach } = test;

describe("alerts in the daily tab", () => {
  beforeEach(async ({ page }) => {
    await page.goto("http://localhost:8081/proxy/play/testing");
    await page.goto("/point/34.749/-92.275", { waitUntil: "load"});
    await page.locator("#daily-tab-button").first().click();
  });

  describe("has alerts on the daily overviews", () => {
    test("combines multiple alerts into a single link", async ({ page }) => {
      const day = await page
        .locator(".wx-daily-forecast-block .wx-daily-forecast-list-item")
        .first();
      const links = await day.locator(".daily-alert-summary .wx-alert-link");

      await test.step("there is only one link", async () => {
        await expect(await links.count()).toBe(1);
      });

      const link = await links.first();

      await test.step("text indicates multiple alerts", async () => {
        await expect(link).toContainText("Multiple alerts");
      });
    });

    test("single alerts show the alert type", async ({ page }) => {
      const day = await page
        .locator(".wx-daily-forecast-block .wx-daily-forecast-list-item")
        .nth(1);
      const links = await day.locator(".daily-alert-summary .wx-alert-link");

      await test.step("there is only one link", async () => {
        await expect(await links.count()).toBe(1);
      });

      const link = await links.first();

      await test.step("text indicates multiple alerts", async () => {
        await expect(link).toContainText("Blizzard Warning");
      });
    });
  });

  describe("alerts link to the right places", () => {
    test("multiple alerts link opens the alerts tab only", async ({ page }) => {
      const link = await page
        .locator(
          ".wx-daily-forecast-block .wx-daily-forecast-list-item .daily-alert-summary .wx-alert-link a",
        )
        .first();

      await link.click();

      const alertTab = await page.locator("#alerts").first();

      await expect(alertTab).toBeVisible();
    });

    test("single alert link goes directly to the expected alert", async ({
      page,
    }) => {
      // const alertID = "alert_8760a86c78e313ccfc42aa4eb5166572a0e26e9d_003_1";
      const link = await page
        .locator(
          ".wx-daily-forecast-block .wx-daily-forecast-list-item .daily-alert-summary .wx-alert-link a",
        )
        .nth(0);

      await link.click();

      const alertTab = await page.locator("#alerts").first();
      // const alert = await page.locator(`#${alertID}`).first();

      await expect(alertTab).toBeVisible();

      // Temporarily skipping while we decide on behavior
      // TODO
      // await expect(alert).toBeInViewport();
    });
  });
});
