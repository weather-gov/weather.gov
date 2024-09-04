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
    const iconPath = path.resolve(
      import.meta.dirname,
      "../../web/themes/new_weather_theme/assets/images/weather/icons/conditions",
    );

    const iconMapping = JSON.parse(
      await fs.readFile(
        path.join(import.meta.dirname, "icon.legacyMapping.json"),
      ),
    );

    const errors = [];
    for await (const [key, { icon }] of Object.entries(iconMapping)) {
      if (!(await exists(path.join(iconPath, icon)))) {
        errors.push(`Icon for [${key}] does not exist [${icon}]`);
      }
    }

    if (errors.length) {
      console.log(errors);
    }
    expect(errors).to.have.length(0);
  });
});
