const { test, expect } = require("@playwright/test");
const services = require("../urls.js");

const { describe, beforeEach } = test;

describe("Risk Overview Page Tests", () => {
  describe("when loading a state risk overview", () => {
    beforeEach(async ({ page }) => {
      await page.goto(services.webApp("/forecast/state/CA/risk-overview/"), {
        waitUntil: "load",
      });
    });

    test("the correct state is pre-selected in the state dropdown", async ({
      page,
    }) => {
      const selector = await page.locator(
        `[role="option"][data-value="CA"][aria-selected="true"]`,
      );

      await expect(selector).toHaveCount(1);
    });
    test("the 'all counties' option is selected in the county dropdown", async ({
      page,
    }) => {
      const selector = await page.locator(
        `[role="option"][data-value="all"][aria-selected="true"]`,
      );

      await expect(selector).toHaveCount(1);
    });

    test("selecting a specific county updates the url to have the county version of the url", async ({
      page,
    }) => {
      const countyToggleButton = await page.locator(
        `#county-selector [slot="toggle-button"]`,
      );
      await countyToggleButton.click();

      const butteCountyOption = await page.locator(
        `[role="option"][data-value="06007"]`,
      );
      await butteCountyOption.click();

      const expectedLocation = services.webApp(
        "/forecast/county/06007/risk-overview/",
      );
      await expect(page).toHaveURL(expectedLocation);
    });
  });

  describe("When loading a county risk overview", () => {
    beforeEach(async ({ page }) => {
      await page.goto(
        services.webApp("/forecast/county/06007/risk-overview/"),
        {
          waitUntil: "load",
        },
      );
    });

    test("the correct state and county are  pre-selected in the state dropdown", async ({
      page,
    }) => {
      const stateSelector = await page.locator(
        `[role="option"][data-value="CA"][aria-selected="true"]`,
      );
      await expect(stateSelector).toHaveCount(1);

      const countySelector = await page.locator(
        `[role="option"][data-value="06007"][aria-selected="true"]`,
      );
      await expect(countySelector).toHaveCount(1);
    });

    test("selecting another county updates to the URL of that county", async ({
      page,
    }) => {
      const countyToggleButton = await page.locator(
        `#county-selector [slot="toggle-button"]`,
      );
      await countyToggleButton.click();

      const otherCountySelector = await page.locator(
        `[role="option"][data-value="06003"]`,
      );
      await otherCountySelector.click();

      const expectedLocation = services.webApp(
        "/forecast/county/06003/risk-overview/",
      );
      await expect(page).toHaveURL(expectedLocation);
    });

    test("selecting 'all' counties updates the URL to the state overview url", async ({
      page,
    }) => {
      const countyToggleButton = await page.locator(
        `#county-selector [slot="toggle-button"]`,
      );
      await countyToggleButton.click();

      const allCountySelector = await page.locator(
        `[role="option"][data-value="all"]`,
      );
      allCountySelector.click();

      const expectedLocation = services.webApp(
        "/forecast/state/CA/risk-overview/",
      );
      await expect(page).toHaveURL(expectedLocation);
    });

    test("selecting another state updates the URL to the state overview url for that state and selects 'all' county", async ({
      page,
    }) => {
      const stateToggleButton = await page.locator(
        `#state-selector [slot="toggle-button"]`,
      );
      await stateToggleButton.click();

      const otherStateSelector = await page.locator(
        `[role="option"][data-value="VA"]`,
      );
      otherStateSelector.click();

      const expectedLocation = services.webApp(
        "/forecast/state/VA/risk-overview/",
      );
      await expect(page).toHaveURL(expectedLocation);

      const allCountySelector = await page.locator(
        `[role="option"][data-value="all"][aria-selected="true"]`,
      );
      expect(allCountySelector).toHaveCount(1);
    });
  });

  describe("Misc tests", () => {
    test("when starting from a state risk overview, selecting a specific county shows the view county details link", async ({
      page,
    }) => {
      await page.goto(services.webApp("/forecast/state/CA/risk-overview/"));
      const countyToggleButton = await page.locator(
        `#county-selector [slot="toggle-button"]`,
      );
      await countyToggleButton.click();

      const alamedaCountyOption = await page.locator(
        `[role="option"][data-value="06001"]`,
      );
      await alamedaCountyOption.click();

      const viewCountyDetailsLink = await page.getByRole("link", {
        name: "View county page",
      });

      await expect(viewCountyDetailsLink).toBeVisible();
    });

    test("when starting from a specific county risk overview, selection all counties hides the view county details link", async ({
      page,
    }) => {
      await page.goto(services.webApp("/forecast/county/06001/risk-overview/"));
      const countyToggleButton = await page.locator(
        `#county-selector [slot="toggle-button"]`,
      );
      await countyToggleButton.click();

      const allCountyOption = await page.locator(
        `[role="option"][data-value="all"]`,
      );
      await allCountyOption.click();

      const viewCountyDetailsLink = await page.getByRole("link", {
        name: "View county page",
      });

      await expect(viewCountyDetailsLink).not.toBeVisible();
    });
  });

  describe.skip("State risk overview displays expected risk overview data and components", () => {
    /**
     * We need a series of tests that confirm the expected display and interactivity of the summary and details
     * components given some test data.
     * However, the api-proxy / interop interaction does not currently support using test data for things that
     * are fetched in a cache loop.
     */

    test("placeholder that should fail", async ({ page }) => {
      await expect(true).toEqual(false);
    });
  });

  describe.skip("County risk overview displays expected risk overview data and components", () => {
    /**
     * We need a series of tests that confirm the expected display and interactivity of the summary and details
     * components given some test data.
     * However, the api-proxy / interop interaction does not currently support using test data for things that
     * are fetched in a cache loop.
     */

    test("placeholder that should fail", async ({ page }) => {
      await expect(true).toEqual(false);
    });
  });
});
