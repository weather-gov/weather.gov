import fs from "fs/promises";
import path from "path";
import { expect } from "chai";

const exists = async (file) =>
  fs
    .access(file, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false);

describe("weather icon legacy mapping", async () => {
  it("refers to files that actually exist", async () => {
    const dir = path.dirname(new URL(import.meta.url).pathname);

    const iconPath = path.resolve(
      dir,
      "../../web/themes/new_weather_theme/assets/images/weather/icons/conditions",
    );

    const iconMapping = JSON.parse(
      await fs.readFile(path.join(dir, "icon.legacyMapping.json")),
    );

    const errors = [];
    // eslint-disable-next-line no-restricted-syntax
    for await (const [key, { icon }] of Object.entries(iconMapping)) {
      if (!(await exists(path.join(iconPath, icon)))) {
        errors.push(`Icon for [${key}] does not exist [${icon}]`);
      }
    }

    if (errors.length) {
      console.log(errors); // eslint-disable-line no-console
    }
    expect(errors).to.have.length(0);
  });
});
