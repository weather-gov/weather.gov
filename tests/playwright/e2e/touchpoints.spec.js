const { test, expect } = require("@playwright/test");

const { describe } = test;

describe("Touchpoints button tests", () => {
  describe("Basic layout", () => {

    test("Touchpoints button is visible", async ({ page }) => {
      await page.goto("http://localhost:8080/", { waitUntil: "load" });
      const button = await page.locator("a.touchpoints-button");

      await expect(button).toBeVisible();
    });

    test("Does not occlude any links in the footer", async ({ page }) => {
      await page.goto("http://localhost:8080/");
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      const footerLinks = await page.locator("footer a").last();

      await expect(footerLinks).toBeVisible();
    });
  });
});
