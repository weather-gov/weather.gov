const dayjs = require("dayjs");

describe("main script", () => {
  describe("formats the timestamp according to the browser's locale settings", () => {
    // US English, Mexican Spanish, Puerto Rican Spanish, and US Spanish. Just
    // some representative test cases. If these pass, others should too.
    ["en-US", "es-MX", "es-PR", "es-US"].forEach((locale) => {
      it(`for the ${locale} locale`, () => {
        cy.visit("/local/OHX/50/57/Nashville", {
          onBeforeLoad: (win) => {
            Object.defineProperty(win.navigator, "languages", {
              value: [locale],
            });
          },
        });
        cy.get("weather-timestamp").then((timestamps) => {
          expect(timestamps.length).to.be.greaterThan(0);

          for (const timestamp of timestamps) {
            const utc = timestamp.getAttribute("data-utc");
            const actual = timestamp.innerText;

            // [TODO]
            // Eventually we should replace API calls with fixtures so we don't
            // need to rely on this formatter. If the expected date is fixed,
            // the expected string representations should also be fixed.
            const formatter = new Intl.DateTimeFormat(locale, {
              weekday: "long",
              hour: "numeric",
              minute: "2-digit",
              timeZoneName: "short",
            });

            const expected = formatter.format(dayjs.unix(utc).toDate());
            expect(actual).to.equal(expected);
          }
        });
      });
    });
  });
});
