const { test: base, expect } = require("@playwright/test");

const test = base.extend({
  tabs: async ({ page }, use) => {
    const nav = await page.locator("wx-tabbed-nav").first();
    await use(nav);
  },
});

const { describe, beforeEach } = test;

describe("<wx-tabbed-nav> component tests", () => {
  describe("Alert link interaction", () => {
    beforeEach(async ({ page }) => {
      await page.goto("http://localhost:8081/proxy/play/testing");
      await page.goto("/point/34.749/-92.275", { waitUntil: "load"});
    });

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

      test("Has a default selected tab", async ({ page, tabs }) => {
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

      test("Clicking an unselected tab...", async ({ page, tabs }) => {
        const button = await tabs.locator(`.tab-button`).last();
        const tabID = await button.getAttribute("data-tab-name");

        await button.click();

        await test.step("...shows that tab", async () => {
          const tab = page.locator(`#${tabID}`);
          await expect(tab).toBeVisible();
          await expect(button).toHaveAttribute("data-selected");
          await expect(await button.getAttribute("aria-expanded")).toEqual(
            "true",
          );
        });

        await test.step("...hides other tabs", async () => {
          const otherButtons = await tabs.locator(`.tab-button`).all();
          // Remove the last button
          otherButtons.pop();

          for await (const otherButton of otherButtons) {
            await expect(otherButton).not.toHaveAttribute("data-selected");
            await expect(
              await otherButton.getAttribute("aria-expanded"),
            ).toEqual("false");

            const otherTabID = await otherButton.getAttribute("data-tab-name");
            const otherTab = await page.locator(`#${otherTabID}`);
            await expect(otherTab).not.toBeVisible();
          }
        });
      });
    });

    describe("Intercepts click events on above-the-fold alert links", () => {
      test("Clicking an alert link opens the accordion for that link and scrolls to it", async ({
        page,
      }) => {
        const alertLinks = await page.locator("weathergov-alert-list a").all();
        for await (const link of alertLinks) {
          const alertID = await link
            .getAttribute("href")
            .then((href) => href.split("#")[1]);

          await link.click();

          const alert = await page.locator(`#${alertID}`).first();
          const content = await alert.locator(".usa-accordion__content");

          await expect(content).not.toHaveAttribute("hidden");
          await expect(content).toBeVisible();
          await expect(content).toBeInViewport();
        }
      });

      test("Opens the alert tab if not already open when an alert link is clicked", async ({
        page,
        tabs,
      }) => {
        const alertTabButton = await tabs
          .locator(`[data-tab-name="alerts"]`)
          .first();
        const alertTab = await page.locator("#alerts").first();

        // Start by clicking another tab.
        await tabs.locator(`.tab-button`).last().click();

        // Ensure the alerts tab is not selected. Otherwise the remainder of
        // this test will be invalid.
        await expect(alertTab).not.toBeVisible();
        await expect(await alertTabButton.getAttribute("aria-expanded")).toBe(
          "false",
        );
        await expect(alertTabButton).not.toHaveAttribute("data-selected");

        await page.locator("weathergov-alert-list a").last().click();

        await expect(alertTab).toBeVisible();
        await expect(await alertTabButton.getAttribute("aria-expanded")).toBe(
          "true",
        );
        await expect(alertTabButton).toHaveAttribute("data-selected");
      });
    });
  });

  describe("Initial page load with hash", () => {
    test("navigates to the correct alert accordion and opens it", async ({
      page,
    }) => {
      const alertID = "alert_aa84ba418dfe6f3e1eb046cf9e4086aaaaddeb65_001_1";
      await page.goto(`/point/34.749/-92.275#${alertID}`, { waitUnfil: "load"});

      const alert = await page.locator(`#${alertID}`).first();
      const alertContent = await alert
        .locator(".usa-accordion__content")
        .first();
      const alertButton = await alert
        .locator("button.usa-accordion__button")
        .first();

      await expect(alertContent).not.toHaveAttribute("hidden");
      await expect(alert).toBeVisible();
      await expect(alert).toBeInViewport();
      await expect(await alertButton.getAttribute("aria-expanded")).toBe(
        "true",
      );
    });

    ["alerts", "today", "daily"].forEach((tabName) => {
      test(`Activates the ${tabName} tab if the hash is present`, async ({
        page,
      }) => {
        await page.goto(`/point/34.749/-92.275#${tabName}`, { waitUnfil: "load"});
        const tabButton = await page
          .locator(`.tab-button[data-tab-name="${tabName}"]`)
          .first();
        const tab = await page.locator(`#${tabName}`).first();

        await expect(tabButton).toHaveAttribute("data-selected");
        await expect(await tabButton.getAttribute("aria-expanded")).toBe(
          "true",
        );
        await expect(tab).toHaveAttribute("data-selected");
        await expect(tab).toBeVisible();
      });
    });

    test("gracefully handles invalid hashes", async ({ page }) => {
      let gotError = false;
      page.on("pageerror", () => {
        gotError = true;
      });

      const badHash = "urn:hello.there.everyone";
      await page.goto(`/point/34.749/-92.275#${badHash}`, { waitUnfil: "load"});

      expect(gotError).toBe(false);
    });
  });

  describe("Conditional tabs", () => {
    test("Should not display an alerts tab or area if there are no alerts", async ({
      page,
    }) => {
      await page.goto("/point/35.198/-111.651", { waitUntil: "load"});
      const tabButton = await page.locator(
        '.tab-button[data-tab-name="alerts"]',
      );
      const tab = await page.locator(`#alerts`);

      await expect(await tabButton.count()).toBe(0);
      await expect(await tab.count()).toBe(0);
    });
  });

  describe("a11y tablist/tabpanel guidelines tests", () => {
    beforeEach(async ({ page }) => {
      await page.goto("/point/34.749/-92.275", { waitUntil: "load"});
    });

    test("puts focus on the corresponding tabpanel when tab is pushed from a focused tab button", async ({
      page,
    }) => {
      const selectedTab = await page
        .locator(`[role="tab"][data-selected]`)
        .first();
      await selectedTab.focus();
      await selectedTab.press("Tab");

      const focused = await page.locator(":focus").first();
      await expect(focused).toHaveClass(/\bwx-tab-container\b/);
      await expect(await focused.getAttribute("id")).toBe("alerts");
    });

    test("can navigate to the next (right) element when right arrow key is pressed", async ({
      page,
    }) => {
      const startingTab = await page
        .locator('.tab-button[data-tab-name="alerts"]')
        .first();
      startingTab.focus();

      await startingTab.press("ArrowRight");

      const focused = await page.locator(".tab-button:focus").first();

      await expect(focused).toHaveClass(/\btab-button\b/);
      await expect(await focused.getAttribute("data-tab-name")).toBe("today");
    });

    test("If today tab is the first one, pressing left will cycle to the _last_ button in the list", async ({
      page,
    }) => {
      const startingTab = await page
        .locator('.tab-button[data-tab-name="alerts"]')
        .first();
      startingTab.focus();

      await startingTab.press("ArrowLeft");

      const focused = await page.locator(".tab-button:focus").first();

      await expect(focused).toHaveClass(/\btab-button\b/);
      await expect(await focused.getAttribute("data-tab-name")).toBe("daily");
    });

    test("If today tab is the last one, pressing right will cycle to the _first_ button in the list", async ({
      page,
    }) => {
      const startingTab = await page
        .locator('.tab-button[data-tab-name="daily"]')
        .first();
      startingTab.focus();

      await startingTab.press("ArrowRight");

      const focused = await page.locator(".tab-button:focus").first();

      await expect(focused).toHaveClass(/\btab-button\b/);
      await expect(await focused.getAttribute("data-tab-name")).toBe("alerts");
    });

    test("Home key puts focus on the first tab button in the tablist", async ({
      page,
    }) => {
      const startingTab = await page
        .locator('.tab-button[data-tab-name="daily"]')
        .first();
      startingTab.focus();

      await startingTab.press("Home");

      const focused = await page.locator(".tab-button:focus").first();

      await expect(focused).toHaveClass(/\btab-button\b/);
      await expect(await focused.getAttribute("data-tab-name")).toBe("alerts");
    });

    test("End key puts the focus on the last tab button in the tablist", async ({
      page,
    }) => {
      const startingTab = await page
        .locator('.tab-button[data-tab-name="alerts"]')
        .first();
      startingTab.focus();

      await startingTab.press("End");

      const focused = await page.locator(".tab-button:focus").first();

      await expect(focused).toHaveClass(/\btab-button\b/);
      await expect(await focused.getAttribute("data-tab-name")).toBe("daily");
    });
  });
});
