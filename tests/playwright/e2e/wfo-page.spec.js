const { test, expect } = require("@playwright/test");
const services = require("../urls.js");

const { describe } = test;

describe("WFO Information Page Tests", () => {
  test("Responds 404 for any invalid WFO route", async ({ page }) => {
    const response = await page.goto(services.webApp("/offices/XYZ"));

    await expect(response.status()).toEqual(404);
  });
});
