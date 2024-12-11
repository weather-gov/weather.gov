const { test, expect } = require("@playwright/test");

const { describe, beforeEach } = test;

/* eslint no-unused-expressions: off */
describe("Hourly forecast table tests", () => {
  describe("Alert row spanning tests", () => {
    beforeEach(async ({ page }) => {
      await page.goto("http://localhost:8081/proxy/play/testing");
      await page.goto("/point/34.749/-92.275#daily", { waitUntil: "load"});
    });

    test("Should have 2 alert rows on the hourly forecast", async ({
      page,
    }) => {
      const count = await page
        .locator(
          `#daily ol li:first-of-type wx-hourly-table tr[data-row-name="alert"]`,
        )
        .count();
      expect(count).toEqual(5);
    });

    test("There is a Red Flag alert of the correct displayed duration", async ({
      page,
    }) => {
      // We expect there to be a red-flag alert that spans two hours
      // and that contains the correct event label
      const alert = await page.locator(
        `#daily ol li:nth-of-type(1) wx-hourly-table tr[data-row-name="alert"]:nth-of-type(4) td[colspan]:nth-of-type(1)`,
      );

      await expect(alert).toHaveText("Red Flag Warning");
      await expect(alert).toHaveAttribute("colspan", "4");
    });

    test("Has a Special Weather Statement that begins in the third hour and spans 5 hours", async ({
      page,
    }) => {
      const alert = await page.locator(
        `#daily ol li:first-of-type wx-hourly-table tr[data-row-name="alert"]:nth-of-type(6) td[colspan]:nth-child(3)`,
      );

      await expect(alert).toHaveText("Special Weather Statement");
      await expect(alert).toHaveAttribute("colspan", "6");
    });

    test("has a blizzard warning starting tomorrow", async ({ page }) => {
      await expect(
        page.locator(
          `#daily ol li:nth-of-type(2) wx-hourly-table tr[data-row-name="alert"]:nth-child(2) td[colspan]:nth-child(3)`,
        ),
      ).toContainText("Blizzard Warning");
    });
  });

  describe("Alert span clicking behavior", () => {
    beforeEach(async ({ page }) =>
      page.goto("http://localhost:8081/proxy/play/testing", { waitUntil: "load"}),
    );

    test("works when clicking an alert in one of the daily tab's hourly tables", async ({
      page,
    }) => {
      await page.goto("/point/34.749/-92.275#daily", { waitUntil: "load"});

      // Click the alert
      await page
        .locator(
          `#daily ol li:first-child wx-hourly-table tr[data-row-name="alert"]:nth-child(2) .wx-alert-link`,
        )
        .click();

      await expect(page.locator("#alerts")).toBeVisible();

      const targetAlert = await page.locator("#alerts button").nth(2);
      await expect(targetAlert).toContainText("Warning");
      await expect(targetAlert).toHaveAttribute("aria-expanded", "true");

      await expect(
        page.locator("#alert_82d03a893a84390fbc5217471cd259eaa41a4135_001_1"),
      ).toBeVisible();
    });
  });

  describe("Hourly precipitation tables", () => {
    test("Renders tables for every day", async ({ page }) => {
      await page.goto("/point/34.749/-92.275#daily", { waitUntil: "load"});

      const count = await page
        .locator("#daily ol li table.wx-precip-table")
        .count();

      expect(count).not.toEqual(0);
    });
  });
});
