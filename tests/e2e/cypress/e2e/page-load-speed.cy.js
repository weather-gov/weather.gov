describe("load pages", () => {
    it("is not a test, is just a utility", () => {
      const pages = [
        { name: "location page 1", url: "/local/OKX/33/35/Hoboken" },
        { name: "location page 2", url: "/local/LOX/155/45/Vernon" },
        { name: "location page 3", url: "/local/LOT/75/73/Chicago" },
        { name: "location page 4", url: "/local/HGX/65/97/Houston" },
        { name: "location page 5", url: "/local/PSR/159/58/Guadalupe" },
      ];
      let totalTime = 0;
  
      for (const { name, url } of pages) {
        const startTime = performance.now();

        cy.visit(url);
        cy.wrap(performance.now()).then(endTime => {
            totalTime += startTime - endTime;
            cy.log(`${name}: page load took ${startTime - endTime} milliseconds.`);
        })
      }

      cy.log(`average time: ${totalTime / pages.length} milliseconds.`)
    });
  });
  