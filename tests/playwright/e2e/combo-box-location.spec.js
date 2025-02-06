/* eslint-disable no-await-in-loop, no-plusplus */
const { test, expect } = require("@playwright/test");
const arcQueryData = require("../mock-data/arc.query.json");
const arcQueryItemsData = require("../mock-data/arc.query.items.json");

const { describe, beforeEach } = test;

describe("wx-combo-box-location tests", () => {
  beforeEach(async ({ page }) => {
    // Stub the ArcGIS API requests
    // so that they use saved data
    await page.route(
      "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest*",
      async (route) => {
        await route.fulfill({ json: arcQueryData });
      },
    );
    await page.route(
      "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/find*",
      async (route) => {
        const url = new URL(route.request().url());
        const key = url.searchParams.get("magicKey");
        const mockData = arcQueryItemsData[key];
        if (mockData) {
          await route.fulfill({ json: mockData });
        } else {
          await route.abort();
        }
      },
    );

    await page.goto("http://localhost:8080", { waitUntil: "load"});
  });

  test("Can find the combo-box element", async ({ page }) => {
    const combobox = page.locator("wx-combo-box-location");

    await expect(combobox).toHaveCount(1);
    await expect(combobox).toBeVisible();
  });

  describe("When typing into the input", () => {
    beforeEach(async ({ page }) => {
      const comboInput = page.locator("wx-combo-box-location > input");
      await comboInput.fill("Arlin");
    });

    test("it displays a visible dropdown list", async ({ page }) => {
      const list = page.locator("wx-combo-box-location ul");

      await expect(list).toBeVisible();
    });

    test("the first item in the dropdown list is aria-selected", async ({
      page,
    }) => {
      const ariaSelectedItem = page.locator(
        'wx-combo-box-location ul li:first-child[aria-selected="true"]',
      );

      await expect(ariaSelectedItem).toHaveCount(1);
    });

    test("typing the down key pseudo-focuses the second element", async ({
      page,
    }) => {
      const correctSelection = page.locator(
        'wx-combo-box-location ul > li[aria-selected="true"]:nth-child(2)',
      );
      await page.keyboard.press("ArrowDown");

      await expect(correctSelection).toHaveCount(1);
      await expect(correctSelection).toBeVisible();
    });

    test("typing down twice pseudo-focuses the third element", async ({
      page,
    }) => {
      const correctSelection = page.locator(
        'wx-combo-box-location ul > li[aria-selected="true"]:nth-child(3)',
      );
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowDown");

      await expect(correctSelection).toHaveCount(1);
      await expect(correctSelection).toBeVisible();
    });

    test("pressing the up arrow collapses the search list", async ({
      page,
    }) => {
      const resultList = page.locator("wx-combo-box-location ul");
      await page.keyboard.press("ArrowUp");

      await expect(resultList).not.toBeVisible();
    });

    test("pressing Enter selects an item, closing the list from view", async ({
      page,
    }) => {
      // Ensure that the page doesn't navigate so we can test the presence of
      // the loader
      await page.route(
        "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/find*",
        async (route) => {
          await route.abort();
        },
        { times: 1 },
      );
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
      const list = page.locator("wx-combo-box-location ul");

      await expect(list).not.toBeVisible();
    });

    test("clicking selects the second item and navigates to the location page", async ({
      page,
    }) => {
      const thirdItem = page.locator(
        "wx-combo-box-location ul > li:nth-child(3)",
      );
      await thirdItem.click();
      await page.waitForNavigation();

      await expect(page.url()).toMatch(/.*\/point\/.*/);
    });

    test("clicking the second item displays the loading element", async ({
      page,
    }) => {
      // Ensure that the page doesn't navigate so we can test the presence of
      // the loader
      await page.route(
        "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/find*",
        async (route) => {
          await route.abort();
        },
        { times: 1 },
      );
      const thirdItem = page.locator(
        "wx-combo-box-location ul > li:nth-child(3)",
      );
      const loader = page.locator("wx-loader");
      await thirdItem.click();

      await expect(loader).toBeVisible();
    });
  });
});
