/* eslint-disable no-await-in-loop, no-plusplus */
const { test, expect } = require("@playwright/test");

const { describe, beforeEach } = test;

describe("radar component", () => {
  describe("radar container", () => {
    beforeEach(async ({ page }) => {
      await page.goto("http://localhost:8081/play/testing");
      await page.goto("/point/35.198/-111.651");
    });

    describe("is initialized...", () => {
      test("in unexpanded state", async ({ page }) => {
        const container = page.locator(".wx-radar-container");
        await expect(container).not.toHaveClass(
          /\bwx-radar-container__expanded\b/,
        );
      });

      test("with 'zoom out' icon'", async ({ page }) => {
        const iconHref = await page
          .locator(".wx-radar-container svg use")
          .getAttribute("xlink:href");
        await expect(iconHref).toMatch(/uswds\/sprite\.svg#zoom_out_map$/);
      });

      test("with 'expand' text description", async ({ page }) => {
        const descriptions = await page.locator(
          ".wx-radar-expand__description",
        );
        await expect(descriptions).toHaveCount(2);

        const hidden = await page.locator(
          ".wx-radar-expand__description.display-none",
        );
        await expect(hidden).toHaveCount(1);
        await expect(hidden).toContainText("collapse");
      });
    });

    describe("toggles expanded state...", () => {
      const click = (page) =>
        page.locator(".wx-radar-container button.wx-radar-expand").click();

      describe("from unexpanded to expanded...", () => {
        test("expands", async ({ page }) => {
          await click(page);
          const container = page.locator(".wx-radar-container");
          await expect(container).toHaveClass(
            /\bwx-radar-container__expanded\b/,
          );
        });

        test("changes to the 'zoom in' icon", async ({ page }) => {
          await click(page);
          const iconHref = await page
            .locator(".wx-radar-container svg use")
            .getAttribute("xlink:href");
          await expect(iconHref).toMatch(
            /images\/spritesheet\.svg#wx_zoom-in-map$/,
          );
        });

        test("sets text description to 'collapse'", async ({ page }) => {
          await click(page);
          const descriptions = await page.locator(
            ".wx-radar-expand__description",
          );
          await expect(descriptions).toHaveCount(2);

          const hidden = await page.locator(
            ".wx-radar-expand__description.display-none",
          );
          await expect(hidden).toHaveCount(1);
          await expect(hidden).toContainText("expand");
        });

        test("triggers a window resize event", async ({ page }) => {
          page.evaluate(() =>
            window.addEventListener("resize", () => {
              window.WX_TEST_RESIZE_FIRED = true;
            }),
          );

          await click(page);

          const out = await page
            .waitForFunction(() => window.WX_TEST_RESIZE_FIRED)
            .then((response) => response.jsonValue());

          expect(out).toBe(true);
        });
      });

      describe("from expanded to unexpanded...", () => {
        beforeEach(async ({ page }) => click(page));

        test("expands", async ({ page }) => {
          await click(page);
          const container = page.locator(".wx-radar-container");
          await expect(container).not.toHaveClass(
            /\bwx-radar-container__expanded\b/,
          );
        });

        test("changes to the 'zoom in' icon", async ({ page }) => {
          await click(page);
          const iconHref = await page
            .locator(".wx-radar-container svg use")
            .getAttribute("xlink:href");
          await expect(iconHref).toMatch(/uswds\/sprite\.svg#zoom_out_map$/);
        });

        test("sets text description to 'expand'", async ({ page }) => {
          await click(page);
          const descriptions = await page.locator(
            ".wx-radar-expand__description",
          );
          await expect(descriptions).toHaveCount(2);

          const hidden = await page.locator(
            ".wx-radar-expand__description.display-none",
          );
          await expect(hidden).toHaveCount(1);
          await expect(hidden).toContainText("collapse");
        });

        test("triggers a window resize event", async ({ page }) => {
          page.evaluate(() =>
            window.addEventListener("resize", () => {
              window.WX_TEST_RESIZE_FIRED = true;
            }),
          );

          await click(page);

          const out = await page
            .waitForFunction(() => window.WX_TEST_RESIZE_FIRED)
            .then((response) => response.jsonValue());

          expect(out).toBe(true);
        });
      });
    });
  });
});
