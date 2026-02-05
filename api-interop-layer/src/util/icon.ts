import { logger } from "./monitoring/index.js";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const iconLogger = logger.child({ subsystem: "icon" });
const __filename = fileURLToPath(import.meta.url);
const dir = path.dirname(__filename);
const legacyMapping: Record<string, { icon: string }> = JSON.parse(
  (await fs.readFile(`${dir}/icon.legacyMapping.json`)).toString(),
);

interface IconResult {
  icon: string | null;
  base: string | null;
}

export const parseAPIIcon = (apiIcon: string): IconResult => {
  const icon: IconResult = {
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
  } else {
    iconLogger.warn({ iconKey }, "not found in icon.legacyMapping.json");
  }

  return icon;
};

export default { parseAPIIcon };
