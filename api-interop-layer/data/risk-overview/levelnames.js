/**
 * A canonical list of fallback levelnames for
 * each level (a number, also referred to as "category")
 * for each risk scale.
 * Scales can be anything from 2 levels to 5 levels,
 * and are determined by the processed legend data.
 */
export const levelnames = {
  5: ["None", "Very Low", "Low", "Moderate", "High", "Very High"],
  4: ["None", "Very Low", "Low", "High", "Very High"],
  3: ["None", "Low", "Moderate", "High"],
  2: ["None", "Moderate", "High"],
};

/**
 * Respond with the string of a fallback levelName
 * for the given level number at the corresponding
 * scale (2-level, 3-level scales, etc).
 * @param {Number} levelNum - The current level
 * within the scale (aka "category" in places)
 * @param {Number} scale - The scale (max level)
 * in which the level should be evaluated
 * @returns {String} The fallback levelname
 */
export const getFallbackLevelName = (levelNum, scale) => {
  if (levelnames[scale] && levelNum < levelnames[scale].length) {
    return levelnames[scale][levelNum];
  }

  // If the scale or levelNum given isn't present
  // in our fallback dictionary, we return a descriptive
  // level name that also indicates a processing error
  return `Level ${levelNum} of ${scale}`;
};
