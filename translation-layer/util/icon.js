import fs from "node:fs/promises";

const legacyMapping = JSON.parse(
  await fs.readFile(`${import.meta.dirname}/icon.legacyMapping.json`),
);

export const parseAPIIcon = (apiIcon) => {
  const icon = {
    icon: null,
    base: null,
  };

  // Make sure we can parse the icon URL first. If we can't... well... finished!
  if (!URL.canParse(apiIcon)) {
    return icon;
  }

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

  return icon;
};

export default { parseAPIIcon };
