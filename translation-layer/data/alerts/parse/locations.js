export const parseLocations = (description) => {
  let updatedDescription = description;
  const locations = { regions: [], cities: [] };

  // If the alert description has fine-grained location information, there
  // will be a line that starts with:
  //
  // IN [STATE] THIS [WARNING | WATCH | WHATEVER] INCLUDES 13 COUNTIES
  //
  // So if we have a line that matches, we should try parsing it.
  const [startToken] =
    description.match(
      /IN \S+ (THIS|THE NEW) \S+ INCLUDES \d+ COUNTIES\n$/ims,
    ) ?? [];
  if (startToken) {
    // Keep track of where the extra location information lives inside
    // the alert description so it's easier to remove it later.
    const startIndex = updatedDescription.indexOf(startToken);
    let endIndex = startIndex + startToken.length;

    // First get the regions of the covered states. This will be things
    // like "Northwest Nebraska". This will create two matches: one for
    // the entire line and another for just the region area name.
    updatedDescription
      .slice(endIndex)
      .match(/IN (.+)\n/g)
      // The region description will end with a newline. For
      // simplicity in the regex later, we'll eat this newline
      // here.
      .map((v) => v.trim())
      .forEach((regionToken) => {
        const [, region] = regionToken.match(/IN (.+)/);

        // Account for the two newlines at the end of the token.
        endIndex += regionToken.length + 2;

        // If the alert covers multiple states, we can end up with
        // several of these "THIS WATCH INCLUDES 42 COUNTIES"
        // headings. If this is such a thing, then it is not a
        // county area heading and we can skip it.
        if (/THIS \S+ INCLUDES \d+ COUNTIES$/.test(regionToken)) {
          return;
        }

        const area = region
          .replace(/^IN /, "")
          .replace(
            /\w\S*/g,
            (text) =>
              text.charAt(0).toUpperCase() + text.slice(1).toLowerCase(),
          );

        // The list of counties begins where the region name is
        // followed by two newlines and continues until either
        // another pair of newlines OR the end of the text.
        const [, innerPlaces] =
          description.slice(endIndex).match(/([\s\S]+?)(\n\n|$)/is) ?? [];

        // The counties are delimitted by multiple spaces, so replace
        // 2 or more spaces with a single comma. The county list also
        // spans multiple lines, so replace newlines with commas as
        // well. Finally, split the list on commas to get the
        // individual items.
        const counties = innerPlaces
          .trim()
          .replace(/\n/g, "  ")
          .replace(/\s{2,}/g, ",")
          .split(",")
          .map((c) =>
            c.replace(
              /\w\S*/g,
              (text) =>
                text.charAt(0).toUpperCase() + text.slice(1).toLowerCase(),
            ),
          );

        if (counties.length > 0) {
          locations.regions.push({
            area,
            counties,
          });
        }

        // Keep advancing the end index.
        endIndex += innerPlaces?.length ?? 0;
      });

    // When there is this particularly formatted location information
    // in the alert description, there is also sometimes a list of
    // cities. So let's look for those, too.
    const [citiesToken, cities] =
      updatedDescription.match(
        /THIS INCLUDES THE CITIES OF([\s\S]+?)(\n\n|$)/is,
      ) ?? [];

    if (cities) {
      locations.cities = cities
        // The list of cities may be grammatically correct and end
        // with an "and" before the last item. We don't actually
        // care about that, so remove it if it's there.
        .replace(/\sand\s/i, "")
        // Cites are delimitted by commas and a single city can span
        // multiple lines (like "St. Louis" where perhaps the "St."
        // is on one line and "Louis" is on the other). So, replace
        // newlines with spaces.
        .replace(/\n/g, " ")
        .split(",")
        // Trim the city names and title-case them. Sometimes the cities will
        // have a period at the very end, too, so eat that, just in case.
        .map((s) =>
          s
            .trim()
            .replace(/.$/, "")
            .replace(
              /\w\S*/g,
              (text) =>
                text.charAt(0).toUpperCase() + text.slice(1).toLowerCase(),
            ),
        );

      // Advance the end index, plus two newlines.
      endIndex += citiesToken.length + 2;
    }

    // Build a new description string with the location information stripped out
    // since we have captured that in structured data now.
    updatedDescription =
      updatedDescription.slice(0, startIndex) +
      updatedDescription.slice(endIndex);
  }

  if (locations.regions.length > 0 || locations.cities.length > 0) {
    return { description: updatedDescription.trim(), locations };
  }
  return { description, location: false };
};

export default { parseLocations };
