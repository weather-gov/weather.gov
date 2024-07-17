describe("pages load", () => {
  before(() => {
    /**
     * Due to how translations are initially cached, we should
     * visit any relevant point location page that will *not*
     * be visited later as part of this test suite.
     * We want to assume translation cache has been loaded
     * but not individual point location caches.
     */
    const preloadPage = {
      name: "Brooklyn Heights, NY",
      url: "/point/40.693/-73.991"
    };
    cy.visit(preloadPage.url);
  });
  
  it("average less than 3 seconds, max less than 5 seconds", () => {
    const pages = [
      { name: "Hoboken, NJ", url: "/point/40.737/-74.031" },
      { name: "Huntington Park, CA", url: "/point/34.005/-118.23" },
      { name: "Chicago, IL", url: "/point/41.884/-87.632" },
      { name: "Houston, TX", url: "/point/29.7819/-95.3805" },
      { name: "Guadalupe, AZ", url: "/point/33.365/-111.963" },
    ];

    const measurements = [];

    // Measures the first page in the list of pages. When it's done, if there
    // are any pages left in the list, does it again. This helps ensure our
    // tests are running synchronously rather than in parallel so our timers
    // will be a little more accurate.
    const measurePage = () => {
      const { name, url } = pages.shift();
      performance.mark(name);
      cy.visit(url);

      // We want to wait until the current conditions are found on the page.
      // Note that this can inflate the timing numbers a bit because Cypress
      // will retry a few times with a short wait in between. Return the result
      // because it's a Cypress chainable object and the caller can use it to
      // know when we're all finished.
      return cy.get(".wx-current-conditions").then(() => {
        const measurement = performance.measure(name, { start: name });
        measurements.push({
          name,
          url,
          measurement: Math.round(measurement.duration),
        });

        // Whether there are more pages or not, return a Cypress chainable.
        if (pages.length > 0) {
          return measurePage();
        }
        return cy.wrap();
      });
    };

    // Meaure the pages. When they're completely finished, then we can get the
    // max and average and make our assertions.
    measurePage().then(() => {
      const times = measurements.map(({ measurement }) => measurement);
      const total = times.reduce((prev, now) => prev + now, 0);

      const average = total / times.length;
      const max = Math.max(...times);

      cy.wrap(average).should("be.lessThan", 3000);
      cy.wrap(max).should("be.lessThan", 5000);
    });
  });
});
