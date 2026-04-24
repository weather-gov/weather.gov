const { test, expect } = require("@playwright/test");
const fs = require("fs");
const path = require("path");
const services = require("../urls.js");

const { describe, beforeEach } = test;

describe("State page county links", () => {
  ["alerts", "risks", "radar", "analysis"].forEach(tabName => {
    test(`Displays county links url on ${tabName} state tab`, async ({page}) => {
      const response = await page.goto(
        services.webApp(`/forecast/state/NY/${tabName}`),
        { waitUntil: "load" }
      );

      await expect(response.status()).toBe(200);

      const anchor = await page.locator(`a[href="/county/#ny"]`);
      await expect(anchor).toHaveCount(1);
    });

    test(`County links on ${tabName} tab takes us to correct page and scroll position`, async ({page}) => {
      const response = await page.goto(
        services.webApp(`/forecast/state/NY/${tabName}`),
        { waitUntil: "load" }
      );

      await expect(response.status()).toBe(200);

      const anchor = await page.locator(`a[href="/county/#ny"]`);
      anchor.click();
      await page.waitForNavigation("/county/#ny");

      // Find a link to Albany, NY (the first county)
      // and ensure that it is in view
      await expect(
        await page.getByText("Albany, NY")
      ).toBeInViewport();
    });
  });
});

describe("State WFO footer links", () => {
  ["alerts", "risks", "radar", "analysis"].forEach(tabName => {
    test(`Displays the WFO links section on the ${tabName} tab`, async ({page}) => {
      const response = await page.goto(
        services.webApp(`/forecast/state/NY/${tabName}`),
        { waitUntil: "load" }
      );

      await expect(response.status()).toBe(200);

      // Find the header
      const header = await page.getByRole("heading", { name: "Weather forecasting offices" });
      await expect(header).toBeVisible();

      // Find the expected WFO links within this section
      ["BTV", "BUF", "OKX", "ALY", "BGM"].forEach(async (wfoCode) => {
        await expect(
          await page.locator(`[href="/offices/${wfoCode}/"]`)
        ).toBeVisible();
      });
    });
  });
});
