describe("pages load", () => {
  it("average less than 3 seconds, max less than 5 seconds", () => {
    const pages = [
      { name: "location page 1", url: "/local/OKX/33/35/Hoboken" },
      { name: "location page 2", url: "/local/LOX/155/45/Vernon" },
      { name: "location page 3", url: "/local/LOT/75/73/Chicago" },
      { name: "location page 4", url: "/local/HGX/65/97/Houston" },
      { name: "location page 5", url: "/local/PSR/159/58/Guadalupe" },
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
      return cy.get(".weather-gov-current-conditions").then(() => {
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
