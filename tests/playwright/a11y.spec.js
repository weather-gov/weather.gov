const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright");
const services = require("./urls.js");

const pages = [
  { name: "front page", path: "/" },
  {
    name: "location page with alerts (alerts tab)",
    path: "/point/33.521/-86.812#alerts",
  },
  {
    name: "location page with alerts (today tab)",
    path: "/point/33.521/-86.812#today",
  },
  {
    name: "location page with alerts (daily tab)",
    path: "/point/33.521/-86.812#daily",
  },
  {
    name: "location page without alerts (today tab)",
    path: "/point/35.198/-111.651#today",
  },
  {
    name: "location page without alerts (daily tab)",
    path: "/point/35.198/-111.651#daily",
  },
  {
    name: "about page",
    path: "/about/",
  },
  {
    name: "disclaimer page",
    path: "/disclaimer/",
  },
  {
    name: "accessibility page",
    path: "/accessibility/",
  },
  {
    name: "privacy page",
    path: "/privacy/",
  },
  {
    name: "site-index page",
    path: "/site-index/",
  },
];

for (const { name, path } of pages) {
  test.describe(name, () => {
    test("should not have any automatically-detectable accessibility issues", async ({
      page,
    }) => {
      await page.goto(services.webApp(path));

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .exclude('#djDebug')
        .disableRules([
          // TODO: temporarily disabled in order to get Playwright running in CI
          'color-contrast',
          'aria-hidden-focus'
        ])
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
