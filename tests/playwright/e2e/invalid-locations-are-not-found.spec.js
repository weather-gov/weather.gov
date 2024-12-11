const { test, expect } = require("@playwright/test");

const { describe, beforeEach } = test;

describe("invalid location-based routes return 404", () => {
  beforeEach(async ({ page }) =>
    page.goto("http://localhost:8081/proxy/play/testing"),
  );

  describe("for non-numeric points", () => {
    [
      ["with non-numeric latitude", "abc", "123"],
      ["with non-numeric longitude", "123", "abc"],
    ].forEach(([name, lat, lon]) => {
      test(name, async ({ page }) => {
        const response = await page.goto(`/point/${lat}/${lon}`, { waitUnfil: "load"});
        await expect(response.status()).toEqual(404);
      });
    });
  });

  describe("with invalid WFO", () => {
    [
      ["with too-short WFO", "ab"],
      ["with too-long WFO", "abcd"],
      ["with WFO with numbers", "a1b"],
    ].forEach(([name, wfo]) => {
      test(name, async ({ page }) => {
        const response = await page.goto(`/local/${wfo}/1/1`, { waitUnfil: "load"});
        await expect(response.status()).toEqual(404);
      });
    });
  });

  describe("with non-numeric grid coordinates", () => {
    [
      ["with non-numeric X", "a", "1"],
      ["with non-numeric Y", "1", "a"],
    ].forEach(([name, x, y]) => {
      test(name, async ({ page }) => {
        const response = await page.goto(`/local/TST/${x}/${y}`, { waitUnfil: "load"});
        await expect(response.status()).toEqual(404);
      });
    });
  });
});
