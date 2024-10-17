const { test, expect } = require("@playwright/test");

const { describe, beforeEach } = test;

describe("pages load", () => {
  beforeEach(async ({ page }) =>
    /**
     * Due to how translations are initially cached, we should
     * visit any relevant point location page that will *not*
     * be visited later as part of this test suite.
     * We want to assume translation cache has been loaded
     * but not individual point location caches.
     */
    page.goto("/point/40.693/-73.991"),
  );

  test("average less than 3 seconds, max less than 5 seconds", async ({
    page,
  }) => {
    const pages = [
      { name: "Hoboken, NJ", url: "/point/40.737/-74.031" },
      { name: "Huntington Park, CA", url: "/point/34.005/-118.23" },
      { name: "Chicago, IL", url: "/point/41.884/-87.632" },
      { name: "Houston, TX", url: "/point/29.7819/-95.3805" },
      { name: "Guadalupe, AZ", url: "/point/33.365/-111.963" },
    ];

    const measurements = [];

    // Measure our page loads.
    for await (const { name, url } of pages) {
      performance.mark(name);
      await page.goto(url);

      // We want to wait until the current conditions are found on the page.
      // Note that this can inflate the timing numbers a bit because Playwright
      // will retry a few times with a short wait in between.
      await page.locator(".wx-current-conditions").first();

      // Capture the time.
      const measurement = performance.measure(name, { start: name });
      measurements.push({
        name,
        url,
        measurement: Math.round(measurement.duration),
      });
    }

    // Get the max and average and make our assertions.
    const times = measurements.map(({ measurement }) => measurement);
    const total = times.reduce((prev, now) => prev + now, 0);

    const average = total / times.length;
    const max = Math.max(...times);

    expect(average).toBeLessThan(3_000);
    expect(max).toBeLessThan(5_000);
  });
});
