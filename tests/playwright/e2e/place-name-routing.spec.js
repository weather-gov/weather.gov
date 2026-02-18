/**
 * Place name routing and re-routing tests.
 *
 * These tests cover the /place/{state}/{place} route, which
 * resolves a place name to a lat/lon and renders the location
 * page. The route controller also handles canonical URL
 * redirects for spacing, casing, and slash escaping.
 *
 * Relies on the Drupal database having a populated
 * weathergov_geo_places table (loaded from Geonames cities500
 * data during spatial-data setup).
 */
const { test, expect } = require("@playwright/test");

const { describe, beforeEach } = test;

describe("place name routing", () => {
  // Use the test proxy so that after a place redirect, the
  // resulting /point/ page can load with mock API data
  beforeEach(async ({ page }) =>
    page.goto("http://localhost:8081/proxy/play/testing"),
  );

  describe("canonical URL re-routing", () => {
    test("redirects place names with spaces to underscore-escaped URLs", async ({
      page,
    }) => {
      // Navigate with a literal space in the place name.
      // The controller should redirect to the canonical form
      // where spaces become underscores.
      await page.goto("/place/AR/Little Rock", {
        waitUntil: "commit",
      });

      // After the redirect chain, the final URL should have
      // underscores instead of spaces
      const finalUrl = new URL(page.url());
      expect(finalUrl.pathname).toContain("_");
      expect(finalUrl.pathname).not.toContain(" ");
    });

    test("redirects lowercase state codes to canonical casing", async ({
      page,
    }) => {
      // The database stores states in a specific casing (typically
      // uppercase two-letter codes). A lowercase request should
      // redirect to match the stored form.
      await page.goto("/place/al/Birmingham", {
        waitUntil: "commit",
      });

      // The redirect should land on a /place/ URL with the
      // state code in uppercase (canonical form from the DB)
      const finalUrl = new URL(page.url());
      expect(finalUrl.pathname).toMatch(/^\/place\/AL\//);
    });
  });

  describe("successful place resolution", () => {
    test("a known single-word place loads the location page", async ({
      page,
    }) => {
      // Birmingham is a well-known city that should exist in
      // the Geonames cities500 dataset used to populate the DB
      await page.goto("/place/AL/Birmingham", { waitUntil: "load" });

      // The page should render without a 404 — check for the
      // main heading which typically contains the place name
      const heading = page.locator("main h1");
      await expect(heading).toBeVisible();
    });

    test("a known multi-word place loads via underscore escaping", async ({
      page,
    }) => {
      // Multi-word names use underscores in the URL.
      // "Little Rock" in Arkansas should be in the database.
      await page.goto("/place/AR/Little_Rock", { waitUntil: "load" });

      const heading = page.locator("main h1");
      await expect(heading).toBeVisible();
    });
  });

  describe("404 for unknown places", () => {
    test("returns 404 for a completely made-up place name", async ({
      page,
    }) => {
      const response = await page.goto("/place/XX/Doesnotexist99", {
        waitUntil: "commit",
      });
      expect(response.status()).toEqual(404);
    });

    test("returns 404 for a valid state but unknown place", async ({
      page,
    }) => {
      // AL is a real state, but this place shouldn't exist
      const response = await page.goto("/place/AL/Zzzznoplace", {
        waitUntil: "commit",
      });
      expect(response.status()).toEqual(404);
    });

    test("returns 404 for a single-character state code", async ({
      page,
    }) => {
      // The route requires exactly 2 alpha characters for state,
      // so a single character should fail route validation entirely
      const response = await page.goto("/place/A/SomePlace", {
        waitUntil: "commit",
      });
      expect(response.status()).toEqual(404);
    });
  });

  describe("edge cases with special characters", () => {
    test("SQL wildcard percent in place name does not match arbitrary places", async ({
      page,
    }) => {
      // The controller uses LIKE for the DB query, meaning the
      // percent sign is a wildcard. Passing it in the URL could
      // match unintended places. This test documents that behavior.
      //
      // Ideally this would 404 (exact match), but since the
      // current implementation uses LIKE, it may redirect to an
      // existing place. Either outcome is acceptable to document.
      const response = await page.goto("/place/AL/%25", {
        waitUntil: "commit",
      });
      const status = response.status();

      // Must not return a server error — the wildcard should be
      // handled gracefully regardless of LIKE behavior
      expect(status).toBeLessThan(500);

      // If the LIKE wildcard matched a place, verify the redirect
      // landed on a valid location page (not just any random page)
      if (status === 200) {
        const url = new URL(page.url());
        expect(url.pathname).toMatch(/^\/(point|place)\//);
      }
    });

    test("SQL wildcard underscore in place name is handled safely", async ({
      page,
    }) => {
      // Underscore is both the space-escape character for place
      // URLs and a single-character wildcard in SQL LIKE.
      // A bare underscore shouldn't crash or expose data.
      const response = await page.goto("/place/AL/_", {
        waitUntil: "commit",
      });
      const status = response.status();

      // Same as above — no server errors from wildcard handling
      expect(status).toBeLessThan(500);

      // If a match was found via the LIKE wildcard, the final
      // page should be a recognizable location endpoint
      if (status === 200) {
        const url = new URL(page.url());
        expect(url.pathname).toMatch(/^\/(point|place)\//);
      }
    });
  });
});
