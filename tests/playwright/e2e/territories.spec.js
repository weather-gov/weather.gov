const { test, expect } = require("@playwright/test");

const { describe, beforeEach } = test;

describe("territory places are supported", () => {
  beforeEach(async ({ page }) => page.goto("http://localhost:8081/stop"));

  [
    ["/point/13.466/144.746", "Guam (GU)", "Agana Heights Village, GU"],
    ["/point/18.212/-66.051", "Puerto Rico (PR)", "Caguas, PR"],
    ["/point/15.199/145.777", "Northern Mariana Islands (MP)", "Saipan, MP"],
    ["/point/17.736/-64.748", "US Virgin Islands (VI)", "Saint Croix, VI"],

    // ----- We know the ones below this line don't work.
    // The API returns a WFO but no grid coordinates for AS.
    // ["/point/-14.273/-170.703", "American Samoa (AS)", "Pago Pago, AS"],

    // Our own database doesn't contain any places from the Minor Outlying
    // Islands. This is because there are no permanent residents or settlements
    // on any of these islands. We also know the API doesn't have any of them.
    // ["", "US Minor Outlying Islands (UM)", ""],
  ].forEach(([url, territory, place]) => {
    test(`supports ${territory}`, async ({ page }) => {
      await page.goto(url, { waitUntil: "load"});
      await expect(page.locator("main h1")).toContainText(place);

      // These validate that there is forecast data for the territories. But
      // since that's out of our hands - and the API somewhat regularly fails to
      // provide forecast data for any given place - we won't test for it.
      // cy.get("#daily").should("not.contain", "error");
    });
  });
});
