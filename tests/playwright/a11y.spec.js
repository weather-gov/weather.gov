const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright");
// eslint-disable-next-line import/extensions
const pages = require("../pages.json");

for (const { name, url } of pages) {
  test.describe(name, () => {
    test("should not have any automatically-detectable accessibility issues", async ({
      page,
    }) => {
      await page.goto(url);

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });
}
