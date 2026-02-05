import { riskNameToImageNameMap, riskNameToKeyMapping } from "./mappings.js";

export const addRisksToResult = (result: any, wfo: any, days: any, legend: any) => {
  const dataLegend = {};
  const risks = {};

  Object.keys(days[0].risks).forEach((risk) => {
    if (legend[risk]) {
      dataLegend[risk] = legend[risk];
    }

    risks[risk] = {
      name: legend[risk]?.name ?? risk,
      days: days.map(({ risks, timestamp }, dayNumber: any) => {
        if (!risks[risk]) {
          return { category: 0 };
        }

        // For every data element in the risk overview, we want to also provide an
        // image URL. The list of data elements is not the same for all WFOs at all
        // times, so we need to build this dynamically.
        //
        // Sometimes the element key (like "SevereThunderstorm") is not the same
        // key as used in the URL (in this case, "SevereThunderstorms" - note
        // the s at the end). If we have a URL key mapped to the element key,
        // use it. Otherwise just preserve the element key.
        const urlKey = riskNameToImageNameMap.get(risk) ?? risk;

        return {
          image: `https://www.weather.gov/images/${wfo}/ghwo/${urlKey}Day${dayNumber + 1}.jpg`,
          ...risks[risk],
          timestamp,
        };
      }),
    };

    if (legend[risk]) {
      risks[risk].legend = legend[risk];
    }
  });

  result.days = days;
  result.risks = risks;
  result.composite = {
    days: days.map(({ composite, timestamp }) => ({
      ...composite,
      timestamp,
    })),
  };
  result.legend = dataLegend;
};

// Risk overview data is arranged as an object, some of whose keys are timestamps.
// This method pulls out the timestamp keys and returns an array of days containing
// that data instead of an object.
export const processDays = (data: any, legend: any) => {
  // Get the keys that are timestamps.
  const days = Object.keys(data)
    .filter((key) =>
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[-+]\d{2}:\d{2}$/.test(key),
    )
    .map((timestamp, index: any) => ({
      risks: Object.entries(data[timestamp])
        // We don't do anything with the DailyComposite. We'll make our own.
        .filter(([risk]) => risk !== "DailyComposite")
        .reduce((risks, [risk, category]: [string, any]) => ({
            ...risks,
            [risk]: {
              // Grab all the legend information for this risk and category
              // and stuff it into this risk entry for the day.
              ...legend[risk]?.category[category],
              // Also preserve the raw category
              category,
            },
          }),
          {},
        ),
      dayNumber: index + 1,
      timestamp,
    }));

  // Get the list of risks that are non-zero for at least one day.
  const actualRisks = new Set<string>();
  const noRisks = new Set<string>();

  days.forEach(({ risks }) => {
    Object.keys(risks).forEach((risk) => {
      noRisks.add(risk);
      if (risks[risk].category > 0) {
        actualRisks.add(risk);
      }
    });
  });

  // We also want the list of risks that are present in the
  // data but whose category is zero for every day.
  noRisks.forEach((risk) => {
    if (actualRisks.has(risk)) {
      noRisks.delete(risk);
    }
  });

  // For each day, compute a composite risk category/level.
  days.forEach((day: any) => {
    // Remove any risks from the day that are always zero.
    // We don't display the 0-level risks, so no need to
    // preserve them.
    Object.keys(day.risks)
      .filter((risk) => !actualRisks.has(risk))
      .forEach((noRisk) => {
        delete day.risks[noRisk];
      });

    // Extract all of the categories for the day, along with the max
    // for each of those risks. The max comes from the list of categories
    // in the legend data.
    const categories = Object.entries(day.risks).map(([key, { category }]: [string, any]) => {
      // Sometimes the legend data does not have entries that correspond
      // to risks in the data. In that case, assume a maximum risk level
      // of five for now.
      let max = 5;
      if (legend[key] && legend[key].category) {
        max = Math.max(...Object.keys(legend[key].category).map((v) => +v));
      }

      return {
        category,
        max,
      };
    });

    // Now scale the category relative to its max.
    const scaled = categories.map(({ category, max }) => category / max);

    // Finally, set the composite to the highest category and the
    // highest scaled value.
    day.composite = {
      max: Math.max(...categories.map(({ category }) => category)),
      scaled: Math.round(Math.max(...scaled) * 100) / 100,
    };
  });

  return {
    days,
    noRisks: Array.from(noRisks).map((risk) => legend[risk]?.name ?? risk),
  };
};

export const processLegend = (legendData: any) =>
  legendData.hazards.reduce((all, hazard: any) => {
    // We need to map the risk names from the legend into the risk keys in
    // the actual data. We have a mapping that covers all the risks we know
    // about right now, but as a stopgap for risks we don't know about, we
    // will try to convert hazard names into keys based on how it tends to go.
    //
    // We have asked GHWO to add this mapping into the legend metadata
    // for us, so hopefully we can switch over to that before long.
    const riskKey = riskNameToKeyMapping.has(hazard.name)
      ? riskNameToKeyMapping.get(hazard.name)
      : hazard.name.replace(/ Risk$/, "").replace(/[^a-z]/gi, "");

    const legend = {
      ...all,
      // Use the risk key as the key here, for faster lookup later. This lets
      // us quickly find the risk name and category information from the legend.
      [riskKey]: {
        name: hazard.name,
        category: hazard.category,
      },
    };

    // This is ugly. Let me explain. And then you will agree it is ugly
    // and you will be sad but hopefully you will at least understand.
    // Maybe you will know a better way.
    //
    // When we reach this point, the legend object looks like this:
    //
    // {
    //   risk_key_1: {
    //     name: "Risk #1",
    //     category: {
    //       "0": {
    //          color: "blue",
    //          definition: "sad",
    //          levelName: "ba-da-be-da",
    //        },
    //       "1": {
    //          color: "yellow",
    //          definition: "happy",
    //          levelName: "I'm so",
    //        },
    //       "2": {
    //          color: "red",
    //          definition: "corvette",
    //          levelName: "Prince",
    //        },
    //     }
    //   }
    // }
    //
    // What we need to do is add the category number, currently expressed
    // as the key in the `category` object, as a property as well. That is,
    // category 0 becomes this:
    //
    // category: {
    //   "0": {
    //     color: "blue",
    //     definition: "sad",
    //     levelName: "ba-da-be-da",
    //     category: 0,         <--- this one is new, compared to above
    //   }
    // }
    //
    // So we use this funky object value iteration. The key is the
    // numeric category (though, in fact, expressed as a string), and the
    // value is the category legend data. And we can smoosh those together.
    Object.entries(legend[riskKey].category).forEach(([categoryNumber, categoryValue]: [string, any]) => {
        categoryValue.category = +categoryNumber;
      },
    );

    return legend;
  }, {});
