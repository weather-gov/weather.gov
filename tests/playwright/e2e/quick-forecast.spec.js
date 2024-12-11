const { test, expect } = require("@playwright/test");

const { describe, beforeEach } = test;

beforeEach(async ({page}) => {
  await page.goto("http://localhost:8081/proxy/play/testing");
  await page.goto("/point/34.749/-92.275", { waitUntil: "load"});
  await page.locator("#daily-tab-button").click();
  await page.locator('.wx-quick-forecast[role="tablist"]').waitFor();
});

describe("Quick Forecast navigation tests", () => {

  describe("Selecting a quick forecast item", () => {
    test("shows the corresponding tabpanel", async ({page}) => {
      const navItem = await page.locator(".wx-quick-forecast-item:nth-child(3)");
      const target = await navItem.getAttribute("aria-controls");
      await navItem.click();
      const tabpanel = await page.locator(`#${target}`);

      await expect(tabpanel).toBeVisible();
    });

    test("does not display the non-selected tabpanels", async ({page}) => {
      const navItem = await page.locator(".wx-quick-forecast-item:nth-child(3)");
      const target = await navItem.getAttribute("aria-controls");
      await navItem.click();
      const nonActivePanels = await page.locator(`.wx-daily-forecast-list-item[role="tabpanel"]:not(#${target})`).all();

      nonActivePanels.forEach(async (panel) => {
        await expect(panel).not.toBeVisible();
      });
    });
  });
  
  describe("a11y", () => {
    describe("When clicking the second element in the quick forecast", () => {
      test("it has aria-selected set to true", async ({page}) => {
        const quickForecastItem = await page.locator(".wx-quick-forecast .wx-quick-forecast-item:nth-child(2)");
        await quickForecastItem.click();

        await expect(quickForecastItem).toHaveAttribute("aria-selected", "true");
      });

      test("its siblings all have aria-selected set to false", async ({page}) => {
        const quickForecastItem = await page.locator(".wx-quick-forecast .wx-quick-forecast-item:nth-child(2)");
        await quickForecastItem.click();
        const otherItems = await page.locator('.wx-quick-forecast .wx-quick-forecast-item:not(:nth-child(2))[aria-selected="false"]');

        await expect(otherItems).toHaveCount(6);
      });
    });

    describe("When quick forecast nav has focus", () => {
      test("right arrow key navigates to the next item", async ({page}) => {
        await page.locator(".wx-quick-forecast .wx-quick-forecast-item:first-child").focus();
        await page.keyboard.press("ArrowRight");
        const secondItemWithFocus = await page.locator(".wx-quick-forecast .wx-quick-forecast-item:nth-child(2)");

        await expect(secondItemWithFocus).toBeFocused();
      });

      test("right arrow key will loop to first item when focus is already on last item", async ({page}) => {
        await page.locator(".wx-quick-forecast .wx-quick-forecast-item:last-child").focus();
        await page.keyboard.press("ArrowRight");
        const firstItem = await page.locator(".wx-quick-forecast .wx-quick-forecast-item:first-child");

        await expect(firstItem).toBeFocused();
      });

      test("left arrow key navigates to the previous item", async ({page}) => {
        await page.locator(".wx-quick-forecast .wx-quick-forecast-item:last-child").focus();
        await page.keyboard.press("ArrowLeft");
        const secondItemWithFocus = await page.locator(".wx-quick-forecast-item:nth-child(6)");

        await expect(secondItemWithFocus).toBeFocused();
      });

      test("left arrow key will loop to last item when focus is already on first item", async ({page}) => {
        await page.locator(".wx-quick-forecast .wx-quick-forecast-item:first-child").focus();
        await page.keyboard.press("ArrowLeft");
        const lastItem = await page.locator(".wx-quick-forecast .wx-quick-forecast-item:last-child");

        await expect(lastItem).toBeFocused();
      });

      test("pressing space bar selects the given item", async ({page}) => {
        const secondItem = await page.locator(".wx-quick-forecast .wx-quick-forecast-item:nth-child(3)");
        await secondItem.focus();
        await page.keyboard.press("Space");

        expect(secondItem).toHaveAttribute("aria-selected", "true");
      });

      test("pressing the home key puts focus on the first nav item", async ({page}) => {
        await page.locator(".wx-quick-forecast-item:nth-child(2)").focus();
        await page.keyboard.press("Home");
        const firstItem = await page.locator(".wx-quick-forecast-item:first-child");

        await expect(firstItem).toBeFocused();
      });

      test("pressing the end key puts focus on last nav item", async ({page}) => {
        await page.locator(".wx-quick-forecast-item:nth-child(2)").focus();
        await page.keyboard.press("End");
        const lastItem = await page.locator(".wx-quick-forecast-item:last-child");

        await expect(lastItem).toBeFocused();
      });
    });
  });
});
