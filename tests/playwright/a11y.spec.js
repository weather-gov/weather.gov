const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright");

const pages = [
  { name: "front page", url: "/" },
  { name: "login page", url: "/user/login" },
  {
    name: "location page with alerts (alerts tab)",
    url: "/point/33.521/-86.812#alerts",
  },
  {
    name: "location page with alerts (today tab)",
    url: "/point/33.521/-86.812#today",
  },
  {
    name: "location page with alerts (daily tab)",
    url: "/point/33.521/-86.812#daily",
  },
  {
    name: "location page without alerts (today tab)",
    url: "/point/35.198/-111.651#today",
  },
  {
    name: "location page without alerts (daily tab)",
    url: "/point/35.198/-111.651#daily",
  },
];

for (const { name, url } of pages) {
  test.describe(name, () => {
    test("should not have any automatically-detectable accessibility issues", async ({
      page,
    }) => {
      await page.goto(url);

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      accessibilityScanResults.incomplete.forEach(
        ({ id, description, nodes }) => {
          if (process.env.CI)
            console.log(
              `\n::warning title=${name} accessibility::(${id}) - ${description} [selectors: ${nodes.map(({ target }) => target).join(", ")}]`,
            );
          else {
            console.log(`${name} accessibility
  ${id} - ${description}
  - ${nodes.map(({ target }) => target).join("\n  - ")}`);
          }
        },
      );

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });
}
