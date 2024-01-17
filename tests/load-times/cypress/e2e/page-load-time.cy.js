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

    const measurePage = () => {
      const { name, url } = pages.shift();
      performance.mark(name);
      cy.visit(url);
      return cy.get(".weather-gov-current-conditions").then(() => {
        const measurement = performance.measure(name, { start: name });
        measurements.push({
          name,
          url,
          measurement: Math.round(measurement.duration),
        });

        if (pages.length > 0) {
          measurePage();
        }
      });
    };

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
