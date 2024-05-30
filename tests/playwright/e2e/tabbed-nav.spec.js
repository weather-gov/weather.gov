const { test: base, expect } = require("@playwright/test");

const test = base.extend({
  tabs: async ({ page }, use) => {
    const nav = await page.locator("wx-tabbed-nav").first();
    await use(nav);
  },
});

const { describe, beforeEach } = test;

describe("<wx-tabbed-nav> component tests", () => {
  beforeEach(async ({ page }) => {
    await page.goto("http://localhost:8081/play/testing");
    await page.goto("/point/34.749/-92.275");
  });

  describe("Alert link interaction", () => {
    describe("Basic tabbed nav tests", () => {
      test("Can find the tabbed-nav element on the page", async ({ tabs }) => {
        await expect(tabs).toBeVisible();
      });

      test("Knows the tabbed-nav is a defined custom element", async ({
        page,
        tabs,
      }) => {
        const customElement = await page.evaluate(
          () => !!window.customElements.get("wx-tabbed-nav"),
        );
        expect(customElement).toBeTruthy();

        const connected = await tabs.evaluate((node) => node.isConnected);
        expect(connected).toBeTruthy();
      });

      test("Has a selected tab", async ({ page, tabs }) => {
        const selected = await tabs
          .locator(`.tab-button[aria-expanded="true"]`)
          .first();

        expect(selected).toBeVisible();
        expect(selected).toHaveAttribute("data-selected");

        const tabID = await selected.getAttribute("data-tab-name");

        const tab = page.locator(`#${tabID}`);
        await expect(tab).toBeVisible();
      });

      test("Unselected tabs are not visible", async ({ page, tabs }) => {
        const unselected = await tabs
          .locator(".tab-button:not([data-selected])")
          .all();

        expect(unselected.length).toBeGreaterThan(0);

        for await (const button of unselected) {
          const tabID = await button.getAttribute("data-tab-name");
          const tab = page.locator(`#${tabID}`);
          await expect(tab).not.toBeVisible();
        }
      });

      test("Clicking an unselected tab shows it", async ({ page, tabs }) => {
        //
      });
    });
  });
});
