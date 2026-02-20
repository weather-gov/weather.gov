import { riskNameToImageNameMap, riskNameToKeyMapping } from "./mappings.js";
import { getFallbackLevelName } from "./levelnames.js";

/**
 * For a given risk factor, peek into the legend and determine
 * what its "scale" is. The scale is defined as the number of
 * category/levels that the risk factor can have.
 * We discount level 0 from this accounting.
 * So far, we have only seen 2, 3, 4, and 5 level scales.
 * Note: We have encountered Rip Current Risk, which has categories
 * 0, 2, and 3 (note that 1 doesn't exist), making it effecively a 2-scale, but we need to treat it as a 3 point scale for procesing purposes
 */
export const getMaxScaleFromLegend = (risk, legend) => {
  if(legend[risk]){
    // Subtracting 1 removes the addition of a 0 category
    // return Object.keys(legend[risk].category).length - 1;
    const levels = Object.keys(legend[risk].category).map(key => {
      return parseInt(key);
    }).filter(num => {
      return !isNaN(num);
    });
    return Math.max(...levels, 0);
  }
  return null;
};

export const addRisksToResult = (result, wfo, days, legend) => {
  const dataLegend = {};
  const risks = {};

  Object.keys(days[0].risks).forEach((risk) => {
    if (legend[risk]) {
      dataLegend[risk] = legend[risk];
    }

    risks[risk] = {
      name: legend[risk]?.name ?? risk,
      days: days.map(({ risks, timestamp }, dayNumber) => {
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
export const processDays = (data, legend) => {
  // Get the keys that are timestamps.
  const days = Object.keys(data)
    .filter((key) =>
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[-+]\d{2}:\d{2}$/.test(key),
    )
    .map((timestamp, index) => ({
      risks: Object.entries(data[timestamp])
        // We don't do anything with the DailyComposite. We'll make our own.
        .filter(([risk]) => risk !== "DailyComposite")
        .reduce(
          (risks, [risk, category]) => ({
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
  const actualRisks = new Set();
  const noRisks = new Set();

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
  days.forEach((day) => {
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
    const categories = Object.entries(day.risks).map(([key, { category }]) => {
      // Sometimes the legend data does not have entries that correspond
      // to risks in the data. In that case, assume a maximum risk level
      // of five for now.
      let max = 5;
      if (legend[key] && legend[key].scale) {
        // The legend should already be processed such that
        // each risk type has its scale computed and set.
        // see processLegend()
        max = legend[key].scale;
      }

      return {
        category,
        max,
      };
    });

    // We only want to compute these values if there are
    // _any_ non-zero risk categories to consider
    if(categories.length){
      // Now scale the category relative to its max.
      const scaled = categories.map(({ category, max }) => category / max);

      // Finally, set the composite to the highest category and the
      // highest scaled value.
      day.composite = {
        max: Math.max(...categories.map(({ category }) => category)),
        scaled: Math.round(Math.max(...scaled) * 100) / 100,
      };
    } else {
      // Otherwise we know that the max and scaled values
      // for the day will both be zero
      day.composite = {
        max: 0,
        scaled: 0
      };
    }
  });

  return {
    days,
    noRisks: Array.from(noRisks).map((risk) => legend[risk]?.name ?? risk),
  };
};

export const processLegend = (legendData) =>
  legendData.hazards.reduce((all, hazard) => {
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
    Object.entries(legend[riskKey].category).forEach(
      ([categoryNumber, categoryValue]) => {
        categoryValue.category = +categoryNumber;

        // If there is not a levelName key in the category dict,
        // or the levelname is not specified, we should pull from
        // the fallback set
        if(!categoryValue.levelName || categoryValue.levelName === ""){
          const riskScale = getMaxScaleFromLegend(riskKey, legend);
          categoryValue.levelName = getFallbackLevelName(categoryNumber, riskScale);
        }
      },
    );

    // Additionally, we need to know on which scale a given risk
    // type has category levels.
    // Scales can be 2 leves, 3 levels, 4 levels, or 5 levels.
    //
    // Since the keys in the legend are all string version of the numbers,
    // we can simply count the number of keys and set that as the "max"
    // for the given scale.
    legend[riskKey].scale = getMaxScaleFromLegend(riskKey, legend); 

    return legend;
  }, {});
