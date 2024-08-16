import fs from "node:fs/promises";

const legacyMapping = JSON.parse(
  await fs.readFile(`${import.meta.dirname}/icon.legacyMapping.json`),
);

export const parseAPIIcon = (apiIcon) => {
  const icon = {
    icon: null,
    base: null,
  };

  if (apiIcon !== null && apiIcon.length > 0) {
    /* The icon path from the API is of the form:
       https://api.weather.gov/icons/land/day/skc
       - OR -
       https://api.weather.gov/icons/land/day/skc/hurricane

       The last two or three path segments are the ones we need
       to identify the current conditions. This is because there can be
       two simultaneous conditions in the legacy icon system.

       For now, we use the _first_ condition given in the path as the canonical
       condition for the key.
    */

    try {
      const iconPath = new URL(apiIcon).pathname
        .split("/")
        // When an icon URL is split into parts, we can throw away the first three
        // parts every time because we don't care about them. They are:
        // 1: an empty string, before the leading slash
        // 2: "icons"
        // 3: "land"
        .splice(3)
        // Some of the conditions have additional text to indicate something like
        // rainfall change or stuff like that. We don't use that, so go ahead and
        // remove it.
        .map((segment) => segment.replace(/,.*$/, ""));

      // If there are three path components left, that means the API icon is for
      // two concurrent conditions. However, we only take the first for now.
      // So remove the second condition.
      if (iconPath.length === 3) {
        iconPath.splice(2, 1);
      }

      const iconKey = iconPath.join("/");
      if (legacyMapping[iconKey]) {
        icon.icon = legacyMapping[iconKey].icon;
        icon.base = icon.icon.slice(0, -4);
      }
    } catch (e) {
      console.log(e);
    }
  }

  return icon;
};

export default { parseAPIIcon };
