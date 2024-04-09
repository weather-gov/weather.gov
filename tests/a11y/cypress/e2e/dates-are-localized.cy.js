const dayjs = require("dayjs");

describe("main script", () => {
  before(() => {
    cy.request("http://localhost:8081/play/testing");
  });

  const obsTime = dayjs("2024-02-20T15:53:00+00:00").toDate();

  describe("formats the narrative timestamp according to the browser's locale settings", () => {
    // US English, Mexican Spanish, Puerto Rican Spanish, and US Spanish. Just
    // some representative test cases. If these pass, others should too.
    ["en-US", "es-MX", "es-PR", "es-US"].forEach((locale) => {
      it(`for the ${locale} locale`, () => {
        const formatter = new Intl.DateTimeFormat(locale, {
          weekday: "long",
          hour: "numeric",
          minute: "2-digit",
          timeZoneName: "short",
        });

        cy.visit("/point/33.521/-86.812/#current", {
          onBeforeLoad: (win) => {
            Object.defineProperty(win.navigator, "languages", {
              value: [locale],
            });
          },
        });

        cy.get(".usa-sr-only").then((sr) => {
          expect(sr.length).to.be.greaterThan(0);

          const expected = formatter.format(obsTime);
          console.log(expected);
          expect(sr).to.contain(expected);
        });
      });
    });
  });
});
