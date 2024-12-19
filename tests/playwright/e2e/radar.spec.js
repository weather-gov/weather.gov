/* eslint-disable no-await-in-loop, no-plusplus */
const { test, expect } = require("@playwright/test");

const { describe, beforeEach } = test;

describe("radar component", () => {
  beforeEach(async ({ page }) => {
    await page.goto("http://localhost:8081/proxy/play/testing");
    await page.goto("/point/35.198/-111.651", { waitUntil: "load"});
  });

  describe("radar container", () => {
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
