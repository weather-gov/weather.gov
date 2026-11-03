const { test, expect } = require("@playwright/test");
const fs = require("fs");
const path = require("path");
const services = require("../urls.js");

const { describe, beforeEach } = test;

describe("Point location page area information links", () => {
  ["alerts", "today", "7-day", "maps", "analysis"].forEach((tabName) => {
    test(`Displays area information links on ${tabName} point location tab`, async ({
      page,
    }) => {
      const response = await page.goto(
        services.webApp(`/forecast/point/33.521/-86.812/${tabName}`),
        { waitUntil: "load" },
      );

      await expect(response.status()).toBe(200);

      // analysis tab also links the county outside the area block
      const countyLink = await page
        .locator(".area-information-links--point")
        .getByRole("link", { name: "Jefferson County, AL", exact: true });
      await expect(countyLink).toHaveAttribute(
        "href",
        "/forecast/county/01073/",
      );

      const stateLink = await page.getByRole("link", {
        name: "State view for Alabama",
      });
      await expect(stateLink).toHaveAttribute("href", "/forecast/state/AL/");

      const afdLink = await page.getByRole("link", {
        name: "Area Forecast Discussion",
        exact: true,
      });
      await expect(afdLink).toHaveAttribute("href", "/tools/afd/BMX/");

      const wfoLink = await page.getByRole("link", {
        name: "NWS Birmingham Forecast Office",
      });
      await expect(wfoLink).toHaveAttribute("href", "/about/offices/BMX/");
    });
  });
});
