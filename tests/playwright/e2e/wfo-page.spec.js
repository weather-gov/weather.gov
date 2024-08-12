/* eslint-disable no-await-in-loop, no-plusplus */
const { test, expect } = require("@playwright/test");

const { describe } = test;

describe("WFO Information Page Tests", () => {
  test("Responds 404 for any invalid WFO route", async ({ page }) => {
    const response = await page.goto("http://localhost:8080/offices/XYZ");

    await expect(response.status()).toEqual(404);
  });
});
