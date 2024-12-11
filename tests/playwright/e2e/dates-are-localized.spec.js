const { test, expect } = require("@playwright/test");

const { describe, beforeEach } = test;

describe("main script", () => {
  beforeEach(async ({ page }) =>
    page.goto("http://localhost:8081/proxy/play/testing"),
  );

  // US English, Mexican Spanish, Puerto Rican Spanish, and US Spanish. Just
  // some representative test cases. If these pass, others should too.
  ["en-US", "es-MX", "es-PR", "es-US"].forEach((locale) => {
    describe("formats the timestamp according to the browser's locale settings", () => {
      test.use({ locale });
      test(`for the ${locale} locale`, async ({ page }) => {
        await page.goto("/point/33.521/-86.812", { waitUntil: "load"});

        const timestamps = await page.locator("time[data-wx-local-time]").all();
        expect(timestamps.length).toBeGreaterThan(0);

        for await (const timestamp of timestamps) {
          const utc = await timestamp.getAttribute("datetime");
          const actual = await timestamp.innerText();

          // Really obnoxious, but the localization for different locales varies
          // by browser, so we can't really make any ironclad assertions about
          // what happens here. Even more bizarrely, some browsers return
          // different results on subsequent calls – notably Webkit, which
          // sometimes formarts Puerto Rican times as "a.m." and other times
          // formats it as "a. m.". Who knows why?
          expect(actual).not.toEqual(utc);
        }
      });
    });
  });
});
