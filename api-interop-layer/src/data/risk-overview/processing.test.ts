import { expect } from "chai";
import { addRisksToResult, processDays, processLegend } from "./processing.js";

describe("risk overview: processing utilities", () => {
  // This represents the raw data from GHWO
  const data = {
    countyName: "FR_Benjamin",
    // The Camp David Accords signed between Egypt and Israel, which
    // led to a peace treaty that still stands and resulted in Nobel
    // Peace Prizes for the Isralie prime minister Menachem Begin and
    // Egyptian president Anwar Sadat.
    "1978-09-17T12:00:00-05:00": {
      // This risk has a known mapping into the legend. Not all risks
      // do, so we need to cover all the cases.
      SevereThunderstorm: 2,
      // This one will only have risk categories of zero and should
      // get filtered out.
      Waterspout: 0,
      // This does not have a known mapping into the legend. It should
      // still be presented in the resulting data, to the maximum
      // extent that we can.
      Meatball: 2,
    },

    // Tuvalu becomes indepent from the United Kingdom.
    "1978-10-01T14:00:00+00:00": {
      SevereThunderstorm: 1,
      Waterspout: 0,
      Meatball: 1,
    },

    // Spain adopts a new constitution, restoring democracy after nearly
    // 40 years of fascist rule by dictator Francisco Franco. la Transición
    // began merely two days after Franco's death in 1975 and concluded
    // in 1982 following a landslide general election that saw the
    // country's first peaceful transfer of power under the new regime.
    "1978-12-06T13:30:00+00:00": {
      SevereThunderstorm: 0,
      Waterspout: 0,
      Meatball: 3,
    },
  };

  // And the corresponding legend data. This is not the raw data and
  // has already been processed.
  const legend = {
    SevereThunderstorm: {
      name: "Severe Thunderstorm Risk",
      category: {
        0: {
          category: 0,
          color: "#000",
          levelName: "zero",
          definition: "none",
        },
        1: {
          category: 1,
          color: "#111",
          levelName: "one",
          definition: "some",
        },
        2: {
          category: 2,
          color: "#222",
          levelName: "two",
          definition: "lots",
        },
      },
    },
    Waterspout: {
      // Also real
      name: "Waterspout Risk",
      category: {
        0: {
          category: 0,
          color: "green",
          levelName: "green",
          definition: "green",
        },
        1: {
          category: 1,
          color: "yellow",
          levelName: "yellow",
          definition: "yellow",
        },
        2: {
          category: 2,
          color: "orange",
          levelName: "orange",
          definition: "orange",
        },
        3: {
          category: 3,
          color: "red",
          levelName: "red",
          definition: "red",
        },
        4: {
          category: 4,
          color: "purple",
          levelName: "purple",
          definition: "purple",
        },
      },
    },
    Pasta: {
      // This one does not map into a key we know about.
      name: "Pasta",
      category: {
        0: {
          category: 0,
          color: "#fff",
          levelName: "alfredo",
          definition: "A cream sauce",
        },
        1: {
          category: 1,
          color: "#f00",
          levelName: "marinara",
          definition: "A tomato sauce",
        },
      },
    },
  };

  it("processes legend data", () => {
    // This is raw GHWO legend data. We need to be sure we process it
    // correctly or else the later tests are built on sand.
    const rawLegend = {
      hazards: [
        {
          // This maps to a key we know about. Ideally the legend data
          // would include keys back to the risk data, but it does
          // not for now. So we need to test that we handle the mapping
          // correctly on our end.
          name: "Severe Thunderstorm Risk",
          category: {
            0: {
              color: "#000",
              levelName: "zero",
              definition: "none",
            },
            1: {
              color: "#111",
              levelName: "one",
              definition: "some",
            },
            2: {
              color: "#222",
              levelName: "two",
              definition: "lots",
            },
          },
        },
        {
          // Also real
          name: "Waterspout Risk",
          category: {
            0: {
              color: "green",
              levelName: "green",
              definition: "green",
            },
            1: {
              color: "yellow",
              levelName: "yellow",
              definition: "yellow",
            },
            2: {
              color: "orange",
              levelName: "orange",
              definition: "orange",
            },
            3: {
              color: "red",
              levelName: "red",
              definition: "red",
            },
            4: {
              color: "purple",
              levelName: "purple",
              definition: "purple",
            },
          },
        },
        {
          // This one does not map into a key we know about.
          name: "Pasta",
          category: {
            0: {
              color: "#fff",
              levelName: "alfredo",
              definition: "A cream sauce",
            },
            1: {
              color: "#f00",
              levelName: "marinara",
              definition: "A tomato sauce",
            },
          },
        },
      ],
    };

    const actual = processLegend(rawLegend);

    // Compare the processed legend to the one we use for downstream tests.
    // Again, test the foundations of later tests, why not? :)
    expect(actual).to.eql(legend);
  });

  it("processes days", () => {
    const expected = [
      {
        timestamp: "1978-09-17T12:00:00-05:00",
        dayNumber: 1,
        // The highest absolute value is 2, from the severe thunderstorm
        // risk. The max level for the thunderstorm risk, derived from
        // the legend, is 2, so the scaled value is 2/2 = 1.
        //
        // The meatball risk is also 2, but it does not have a legend
        // entry so we default its maximum to 5 and therefore its
        // scaled value is only 0.4.
        composite: { max: 2, scaled: 1 },
        risks: {
          SevereThunderstorm: {
            category: 2,
            color: "#222",
            levelName: "two",
            definition: "lots",
          },
          Meatball: {
            // There is no additional metadata available for meatballs
            // because they are not in the legend.
            category: 2,
          },
          // Waterspout is absent entirely, because it is level zero
          // for every day and is thus filtered out.
        },
      },
      {
        timestamp: "1978-10-01T14:00:00+00:00",
        dayNumber: 2,
        // Again severe thunderstorm carries the composite.
        composite: { max: 1, scaled: 0.5 },
        risks: {
          SevereThunderstorm: {
            category: 1,
            color: "#111",
            levelName: "one",
            definition: "some",
          },
          Meatball: {
            // No legend. It would be really weird if legend data
            // just magically appeared partway through processing.
            // Probably not ideal. Thankfully, there's no magic here.
            category: 1,
          },
        },
      },
      {
        timestamp: "1978-12-06T13:30:00+00:00",
        dayNumber: 3,
        // This time the meatball wins. It has a risk level of 3/5,
        // while severe thunderstorm is 0.
        composite: { max: 3, scaled: 0.6 },
        risks: {
          SevereThunderstorm: {
            category: 0,
            color: "#000",
            levelName: "zero",
            definition: "none",
          },
          Meatball: {
            category: 3,
          },
        },
      },
    ];

    const { days, noRisks } = processDays(data, legend);

    expect(days).to.eql(expected);
    expect(noRisks).to.eql(["Waterspout Risk"]);
  });

  it("transmogrifies risk data into the shape that the site needs", () => {
    const { days } = processDays(data, legend);

    const result = {
      this: "is my",
      object: "right here",
      now: "add to it",
    };

    const expected = {
      this: "is my",
      object: "right here",
      now: "add to it",
      days: [
        {
          dayNumber: 1,
          timestamp: "1978-09-17T12:00:00-05:00",
          composite: {
            max: 2,
            scaled: 1,
          },
          risks: {
            SevereThunderstorm: {
              category: 2,
              color: "#222",
              levelName: "two",
              definition: "lots",
            },
            Meatball: { category: 2 },
          },
        },
        {
          dayNumber: 2,
          timestamp: "1978-10-01T14:00:00+00:00",
          composite: {
            max: 1,
            scaled: 0.5,
          },
          risks: {
            SevereThunderstorm: {
              category: 1,
              color: "#111",
              levelName: "one",
              definition: "some",
            },
            Meatball: { category: 1 },
          },
        },

        {
          dayNumber: 3,
          timestamp: "1978-12-06T13:30:00+00:00",
          composite: {
            max: 3,
            scaled: 0.6,
          },
          risks: {
            SevereThunderstorm: {
              category: 0,
              color: "#000",
              levelName: "zero",
              definition: "none",
            },
            Meatball: { category: 3 },
          },
        },
      ],
      risks: {
        SevereThunderstorm: {
          name: "Severe Thunderstorm Risk",
          days: [
            {
              timestamp: "1978-09-17T12:00:00-05:00",
              category: 2,
              color: "#222",
              levelName: "two",
              definition: "lots",
              image:
                "https://www.weather.gov/images/wfo/ghwo/SevereThunderstormsDay1.jpg",
            },
            {
              timestamp: "1978-10-01T14:00:00+00:00",
              category: 1,
              color: "#111",
              levelName: "one",
              definition: "some",
              image:
                "https://www.weather.gov/images/wfo/ghwo/SevereThunderstormsDay2.jpg",
            },
            {
              timestamp: "1978-12-06T13:30:00+00:00",
              category: 0,
              color: "#000",
              levelName: "zero",
              definition: "none",
              image:
                "https://www.weather.gov/images/wfo/ghwo/SevereThunderstormsDay3.jpg",
            },
          ],
          legend: {
            name: "Severe Thunderstorm Risk",
            category: {
              0: {
                color: "#000",
                definition: "none",
                levelName: "zero",
                category: 0,
              },
              1: {
                color: "#111",
                definition: "some",
                levelName: "one",
                category: 1,
              },
              2: {
                color: "#222",
                definition: "lots",
                levelName: "two",
                category: 2,
              },
            },
          },
        },
        Meatball: {
          name: "Meatball",
          days: [
            {
              timestamp: "1978-09-17T12:00:00-05:00",
              category: 2,
              image: "https://www.weather.gov/images/wfo/ghwo/MeatballDay1.jpg",
            },
            {
              timestamp: "1978-10-01T14:00:00+00:00",
              category: 1,
              image: "https://www.weather.gov/images/wfo/ghwo/MeatballDay2.jpg",
            },
            {
              timestamp: "1978-12-06T13:30:00+00:00",
              category: 3,
              image: "https://www.weather.gov/images/wfo/ghwo/MeatballDay3.jpg",
            },
          ],
        },
      },
      composite: {
        days: [
          { max: 2, scaled: 1, timestamp: "1978-09-17T12:00:00-05:00" },
          { max: 1, scaled: 0.5, timestamp: "1978-10-01T14:00:00+00:00" },
          { max: 3, scaled: 0.6, timestamp: "1978-12-06T13:30:00+00:00" },
        ],
      },

      // Meatball doesn't have a legend entry, and Waterspout
      // gets filtered out because all of its risks are zero
      legend: { SevereThunderstorm: legend.SevereThunderstorm },
    };

    addRisksToResult(result, "wfo", days, legend);

    expect(result).to.eql(expected);
  });
});
