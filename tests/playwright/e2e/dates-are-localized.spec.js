const { test, expect } = require("@playwright/test");
const dayjs = require("dayjs");

const { describe, beforeEach } = test;

describe("main script", () => {
  beforeEach(async ({ page }) =>
    page.goto("http://localhost:8081/play/testing"),
  );

  // US English, Mexican Spanish, Puerto Rican Spanish, and US Spanish. Just
  // some representative test cases. If these pass, others should too.
  ["en-US", "es-MX", "es-PR", "es-US"].forEach((locale) => {
    describe("formats the timestamp according to the browser's locale settings", () => {
      test.use({ locale });
      test(`for the ${locale} locale`, async ({ page }) => {
        await page.goto("/point/33.521/-86.812");

        const timestamps = await page.locator("time[data-wx-local-time]").all();
        expect(timestamps.length).toBeGreaterThan(0);

        for await (const timestamp of timestamps) {
          const utc = await timestamp.getAttribute("datetime");
          const actual = await timestamp.innerText();

          // [TODO]
          // Eventually we should replace API calls with fixtures so we don't
          // need to rely on this formatter. If the expected date is fixed,
          // the expected string representations should also be fixed.
          const formatters = new Map([
            [
              "basic",
              new Intl.DateTimeFormat(locale, {
                weekday: "long",
                hour: "numeric",
                minute: "2-digit",
                timeZoneName: "short",
              }),
            ],
            [
              "M d Y T",
              new Intl.DateTimeFormat("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "numeric",
              }),
            ],
          ]);

          const format =
            (await timestamp.getAttribute("data-date-format")) || "basic";

          const expected = formatters.get(format).format(dayjs(utc).toDate());
          expect(actual).toEqual(expected);
        }
      });
    });
  });
});
