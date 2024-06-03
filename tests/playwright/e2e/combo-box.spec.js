/* eslint-disable no-await-in-loop, no-plusplus */
const { test, expect } = require("@playwright/test");
const arcQueryData = require("../mock-data/arc.query.json");
const arcQueryItemsData = require("../mock-data/arc.query.items.json");

const { describe, before, beforeEach } = test;

describe("wx-combo-box tests", () => {
  beforeEach(async ({ page, context }) => {
    // Stub the ArcGIS API requests
    // so that they use saved data
    await page.route("https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest*", async route => {
      await route.fulfill({ json: arcQueryData });
    });
    await page.route("https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/find*", async route => {
      const url = new URL(route.request().url());
      const key = url.searchParams.get("magicKey");
      const mockData = arcQueryItemsData[key];
      if(mockData){
        await route.fulfill({ json: mockData });
      } else {
        await route.abort();
      }
    });

    await page.goto("http://localhost:8080");
  });

  test("Can find the combo-box element", async ({page}) => {
    const combobox = page.locator("wx-combo-box");
    
    await expect(combobox).toHaveCount(1);
    await expect(combobox).toBeVisible();
  });

  describe("When typing into the input", () => {
    beforeEach(async ({page}) => {
      const comboInput = page.locator("wx-combo-box > input");
      await comboInput.fill("Arlin");
    });

    test("it displays a visible dropdown list", async ({page}) => {
      const list = page.locator("wx-combo-box ul");

      await expect(list).toBeVisible();
    });

    test("the first item in the dropdown list is aria-selected", async ({page}) => {
      const ariaSelectedItem = page.locator('wx-combo-box ul li:first-child[aria-selected="true"]');

      await expect(ariaSelectedItem).toHaveCount(1);
    });

    test("typing the down key pseudo-focuses the second element", async ({page}) => {
      await page.keyboard.press("ArrowDown");
      const correctSelection = page.locator('wx-combo-box ul > li[aria-selected="true"]:nth-child(2)');

      await expect(correctSelection).toHaveCount(1);
      await expect(correctSelection).toBeVisible();
    });

    test("typing down twice pseudo-focuses the third element", async ({page}) => {
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowDown");
      const correctSelection = page.locator('wx-combo-box ul > li[aria-selected="true"]:nth-child(3)');

      await expect(correctSelection).toHaveCount(1);
      await expect(correctSelection).toBeVisible();
    });

    test("pressing the up arrow collapses the search list", async ({page}) => {
      await page.keyboard.press("ArrowUp");
      const resultList = page.locator("wx-combo-box ul");

      await expect(resultList).not.toBeVisible();
      await page.pause();
    });

    test("pressing Enter selects an item, closing the list from view", async ({page}) => {
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
      const list = page.locator("wx-combo-box ul");

      await expect(list).not.toBeVisible();
    });

    test("clicking selects the second item and navigates to the location page", async ({page, context}) => {
      const thirdItem = page.locator("wx-combo-box ul > li:nth-child(3)");
      //await thirdItem.evaluate((node) => { node.click(); });
      await thirdItem.click();
      await page.waitForNavigation();

      await expect(page.url()).toMatch(/.*\/point\/.*/);
    });
  });
});
