import { expect } from "chai";
import {
  addRisksToResult,
  processDays,
  processLegend,
  getMaxScaleFromLegend
} from "./processing.js";
import { getFallbackLevelName } from "./levelnames.js";

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
      scale: 2
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
      scale: 4
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
      scale: 1
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
            scale: 2
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


describe("Processing legend scales and fallback levelnames", () => {
  it("correctly identifies a 3-level scale from processed legend", () => {
    /**
     * This test covers a special case where the Rip tide risk
     * legend only includes 2 non-zero levels, but the numbers are
     * each one higher than we would expect.
     * For context: the GHWO team changed the numbers in this scale
     * to get chicklet colors to match their expected severity.
     */
    const legend = {
      "Scale-2 Risk (Rip)": {
        name: "Scale-2 Risk (Rip)",
        category: {
          0: {
            color: "#000",
            definition: "none",
            levelName: "zero",
            category: 0,
          },
          2: {
            color: "#111",
            definition: "some",
            levelName: "one",
            category: 2,
          },
          3: {
            color: "#222",
            definition: "lots",
            levelName: "two",
            category: 3,
          },
        }
      }
    };

    const result = getMaxScaleFromLegend("Scale-2 Risk (Rip)", legend);

    expect(result).to.equal(3);
  });

  it("correctly identifies a 3-level scale from processed legend", () => {
    const legend = {
      "Scale-3 Risk": {
        name: "Scale-3 Risk",
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
          3: {
            color: "#333",
            definition: "even more",
            levelName: "three",
            category: 3
          }
        }
      }
    };

    const result = getMaxScaleFromLegend("Scale-3 Risk", legend);

    expect(result).to.equal(3);
  });

  it("correctly identifies a 4-level scale from processed legend", () => {
    const legend = {
      "Scale-4 Risk": {
        name: "Scale-4 Risk",
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
          3: {
            color: "#333",
            definition: "even more",
            levelName: "three",
            category: 3
          },
          4: {
            color: "#444",
            definition: "still more",
            levelName: "four",
            category: 4
          }
        }
      }
    };

    const result = getMaxScaleFromLegend("Scale-4 Risk", legend);

    expect(result).to.equal(4);
  });

  it("correctly identifies a 5-level scale from processed legend", () => {
    const legend = {
      "Scale-5 Risk": {
        name: "Scale-5 Risk",
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
          3: {
            color: "#333",
            definition: "even more",
            levelName: "three",
            category: 3
          },
          4: {
            color: "#444",
            definition: "still more",
            levelName: "four",
            category: 4
          },
          5: {
            color: "#555",
            definition: "the most",
            levelName: "five",
            category: 5
          }
        }
      }
    };

    const result = getMaxScaleFromLegend("Scale-5 Risk", legend);

    expect(result).to.equal(5);
  });
});

describe("Risk levelName fallbacks", () => {
  /**
   * These tests cover the fallback mechanism for GHWO legend data.
   * We anticipate that at some point soon, GHWO legend.json data will
   * start furnishing data _without_ the `levelName` property in each
   * category dictionary.
   * Because of this forthcoming change, we workshopped a set of fallback
   * labels for each level within each possible risk factor scale.
   * These tests ensure that example legend data without the levelNames
   * will result in processed data that has the fallback values.
   */
  it("works for legend data with a 2-level scale", () => {
    const legend = {
      "genration_time": "time",
      "generation_time_LT": "time_LT",
      "ghwo_version": "test",
      "hazards": [
        {
          "name": "Scale-2 Fallback Test",
          "category": {
            "0": {
              "color": "#000",
              "definition": "scale-2-zero",
            },
            "1": {
              "color": "#111",
              "definition": "scale-2-one",
            },
            "2": {
              "color": "#222",
              "definition": "scale-2-two",
            }
          }
        }
      ]
    };

    const expected = {
      ScaleFallbackTest: {
        category: {
          "0": {
            "color": "#000",
            "definition": "scale-2-zero",
            "levelName": "None",
            "category": 0
          },
          "1": {
            "color": "#111",
            "definition": "scale-2-one",
            "levelName": "Moderate",
            "category": 1
          },
          "2": {
            "color": "#222",
            "definition": "scale-2-two",
            "levelName": "High",
            "category": 2
          }
        },
        name: "Scale-2 Fallback Test",
        scale: 2
      }
    };

    const result = processLegend(legend);

    expect(result).to.eql(expected);
  });

  it("works for legend data with a 3-level scale", () => {
    const legend = {
      "genration_time": "time",
      "generation_time_LT": "time_LT",
      "ghwo_version": "test",
      "hazards": [
        {
          "name": "Scale-3 Fallback Test",
          "category": {
            "0": {
              "color": "#000",
              "definition": "scale-3-zero",
            },
            "1": {
              "color": "#111",
              "definition": "scale-3-one",
            },
            "2": {
              "color": "#222",
              "definition": "scale-3-two",
            },
            "3": {
              "color": "#333",
              "definition": "scale-3-three"
            }
          }
        }
      ]
    };

    const expected = {
      ScaleFallbackTest: {
        category: {
          "0": {
            "color": "#000",
            "definition": "scale-3-zero",
            "levelName": "None",
            "category": 0
          },
          "1": {
            "color": "#111",
            "definition": "scale-3-one",
            "levelName": "Low",
            "category": 1
          },
          "2": {
            "color": "#222",
            "definition": "scale-3-two",
            "levelName": "Moderate",
            "category": 2
          },
          "3": {
            "color": "#333",
            "definition": "scale-3-three",
            "levelName": "High",
            "category": 3
          }
        },
        name: "Scale-3 Fallback Test",
        scale: 3
      }
    };

    const result = processLegend(legend);

    expect(result).to.eql(expected);
  });

  it("works for legend data with a 4-level scale", () => {
    const legend = {
      "genration_time": "time",
      "generation_time_LT": "time_LT",
      "ghwo_version": "test",
      "hazards": [
        {
          "name": "Scale-4 Fallback Test",
          "category": {
            "0": {
              "color": "#000",
              "definition": "scale-4-zero",
            },
            "1": {
              "color": "#111",
              "definition": "scale-4-one",
            },
            "2": {
              "color": "#222",
              "definition": "scale-4-two",
            },
            "3": {
              "color": "#333",
              "definition": "scale-4-three"
            },
            "4": {
              "color": "#444",
              "definition": "scale-4-four"
            }
          }
        }
      ]
    };

    const expected = {
      ScaleFallbackTest: {
        category: {
          "0": {
            "color": "#000",
            "definition": "scale-4-zero",
            "levelName": "None",
            "category": 0
          },
          "1": {
            "color": "#111",
            "definition": "scale-4-one",
            "levelName": "Very Low",
            "category": 1
          },
          "2": {
            "color": "#222",
            "definition": "scale-4-two",
            "levelName": "Low",
            "category": 2
          },
          "3": {
            "color": "#333",
            "definition": "scale-4-three",
            "levelName": "High",
            "category": 3
          },
          "4": {
            "color": "#444",
            "definition": "scale-4-four",
            "levelName": "Very High",
            "category": 4
          }
        },
        name: "Scale-4 Fallback Test",
        scale: 4
      }
    };

    const result = processLegend(legend);

    expect(result).to.eql(expected);
  });

  it("works for legend data with a 5-level scale", () => {
    const legend = {
      "genration_time": "time",
      "generation_time_LT": "time_LT",
      "ghwo_version": "test",
      "hazards": [
        {
          "name": "Scale-5 Fallback Test",
          "category": {
            "0": {
              "color": "#000",
              "definition": "scale-5-zero",
            },
            "1": {
              "color": "#111",
              "definition": "scale-5-one",
            },
            "2": {
              "color": "#222",
              "definition": "scale-5-two",
            },
            "3": {
              "color": "#333",
              "definition": "scale-5-three"
            },
            "4": {
              "color": "#444",
              "definition": "scale-5-four"
            },
            "5": {
              "color": "#555",
              "definition": "scale-5-five"
            }
          }
        }
      ]
    };

    const expected = {
      ScaleFallbackTest: {
        category: {
          "0": {
            "color": "#000",
            "definition": "scale-5-zero",
            "levelName": "None",
            "category": 0
          },
          "1": {
            "color": "#111",
            "definition": "scale-5-one",
            "levelName": "Very Low",
            "category": 1
          },
          "2": {
            "color": "#222",
            "definition": "scale-5-two",
            "levelName": "Low",
            "category": 2
          },
          "3": {
            "color": "#333",
            "definition": "scale-5-three",
            "levelName": "Moderate",
            "category": 3
          },
          "4": {
            "color": "#444",
            "definition": "scale-5-four",
            "levelName": "High",
            "category": 4
          },
          "5": {
            "color": "#555",
            "definition": "scale-5-five",
            "levelName": "Very High",
            "category": 5
          }
        },
        name: "Scale-5 Fallback Test",
        scale: 5
      }
    };

    const result = processLegend(legend);

    expect(result).to.eql(expected);
  });

  it("will provide a descriptive error levelName when the level is beyond the given scale", () => {
    const expected = "Level 7 of 4";
    const actual = getFallbackLevelName(7, 4);

    expect(actual).to.equal(expected);
  });

  it("will provide a descriptive error levelName when the scale is not in our fallback set", () => {
    const expected = "Level 0 of 100";
    const actual = getFallbackLevelName(0, 100);

    expect(actual).to.equal(expected);
  });
});
