const { test, expect } = require("@playwright/test");
const { tomorrow, seventh } = require("../../util/daysOfWeek.js");
const services = require("../../urls.js");

const { describe, beforeEach, beforeAll } = test;

describe("Point forecast › 7 Days tab", () => {
  beforeAll(async ({ request }) => {
    const response = await request.get(
      services.apiProxy("/proxy/play/testing"),
    );
    expect(response.ok()).toBeTruthy();
  });

  beforeEach(async ({ page }) => {
    await page.goto(services.webApp("/point/34.749/-92.275/#daily"), {
      waitUntil: "load",
    });
    const djdt = page.getByRole("link", { name: "Hide »" });
    if (await djdt.isVisible()) {
      await djdt.click(); // click to hide the overlay on dev
    }
  });

  describe("When navigating between days (on desktop)", () => {
    test.beforeEach(({}, testInfo) => {
      test.skip(testInfo.project.use.mobile);
    });

    test("I expect 7 days to choose from", async ({ page }) => {
      const lastDayName = seventh();
      const list = page.getByRole("tablist", {
        name: "daily forecast tab navigation",
      });
      const buttons = list.getByRole("tab");

      await expect(buttons).toHaveCount(7);

      const today =
        /Today \d+\/\d+ Condition [\w+\s]+ Multiple weather alerts High \d+ ℉ Low \d+ ℉ \d+% chance of precipitation/i;
      await expect(buttons.first()).toHaveAccessibleName(today);
      const seven = new RegExp(
        String.raw`${lastDayName} \d+\/\d+ Condition [\w+\s]+ HIGH \d+ ℉ LOW \d+ ℉ \d+% chance of precipitation`,
        "i",
      );
      await expect(buttons.last()).toHaveAccessibleName(seven);
    });

    describe("When navigating with the keyboard", () => {
      test("I expect the right arrow key focuses the next day", async ({
        page,
      }) => {
        const list = page.getByRole("tablist", {
          name: "daily forecast tab navigation",
        });
        const buttons = list.getByRole("tab");
        await buttons.first().focus();

        await page.keyboard.press("ArrowRight");
        await page.keyboard.press("ArrowRight");
        await page.keyboard.press("ArrowRight");
        await page.keyboard.press("ArrowRight");
        await page.keyboard.press("ArrowRight");
        await page.keyboard.press("ArrowRight");
        await expect(buttons.last()).toBeFocused();

        await page.keyboard.press("ArrowRight");
        await expect(buttons.first()).toBeFocused();
      });

      test("I expect the left arrow key focuses the previous day", async ({
        page,
      }) => {
        const list = page.getByRole("tablist", {
          name: "daily forecast tab navigation",
        });
        const buttons = list.getByRole("tab");
        await buttons.last().focus();

        await page.keyboard.press("ArrowLeft");
        await page.keyboard.press("ArrowLeft");
        await page.keyboard.press("ArrowLeft");
        await page.keyboard.press("ArrowLeft");
        await page.keyboard.press("ArrowLeft");
        await page.keyboard.press("ArrowLeft");
        await expect(buttons.first()).toBeFocused();

        await page.keyboard.press("ArrowLeft");
        await expect(buttons.last()).toBeFocused();
      });

      test("I expect pressing the home key focuses the first day", async ({
        page,
      }) => {
        const list = page.getByRole("tablist", {
          name: "daily forecast tab navigation",
        });
        const buttons = list.getByRole("tab");
        await buttons.nth(3).focus();

        await page.keyboard.press("Home");
        await expect(buttons.first()).toBeFocused();
      });

      test("I expect pressing the end key focuses the last day", async ({
        page,
      }) => {
        const list = page.getByRole("tablist", {
          name: "daily forecast tab navigation",
        });
        const buttons = list.getByRole("tab");
        await buttons.nth(3).focus();

        await page.keyboard.press("End");
        await expect(buttons.last()).toBeFocused();
      });
    });

    describe("When selecting a day", () => {
      test("I expect to see the correct day's information", async ({
        page,
      }) => {
        const list = page.getByRole("tablist", {
          name: "daily forecast tab navigation",
        });
        const buttons = list.getByRole("tab");
        await buttons.nth(1).focus();

        await page.keyboard.press("Space");
        await expect(buttons.nth(1)).toHaveAttribute("aria-selected", "true");

        const day = new RegExp(tomorrow(), "i");
        const panel = page.getByRole("tabpanel", { name: day });
        await expect(panel).toBeVisible();
        panel.getByRole("heading", { name: day });
      });
    });
  });

  describe("When navigating between days (on mobile)", () => {
    test.beforeEach(({}, testInfo) => {
      test.skip(!testInfo.project.use.mobile);
    });

    test("I expect 7 days to choose from", async ({ page }) => {
      const lastDayName = seventh();
      const panel = page.getByRole("tabpanel", { name: "7 Days" });
      const buttons = panel
        .getByRole("list")
        .getByRole("heading", { level: 3 });

      await expect(buttons).toHaveCount(7);

      const today =
        /Today \d+\/\d+ Condition: [\w\s]+ Multiple weather alerts High of \d+℉ Low of \d+℉ \d+% chance of precipitation/i;
      await expect(buttons.first()).toHaveAccessibleName(today);
      const seven = new RegExp(
        String.raw`${lastDayName} \d+\/\d+ Condition: [\w+\s]+ High of \d+℉ Low of \d+℉ \d+% chance of precipitation`,
        "i",
      );
      await expect(buttons.last()).toHaveAccessibleName(seven);
    });

    describe("When navigating with the keyboard", () => {
      test("I expect the tab key focuses the next day", async ({
        page,
      }, testInfo) => {
        test.fixme(
          testInfo.project.use.name === "Mobile Safari",
          "Tab key doesn't work",
        );
        const panel = page.getByRole("tabpanel", { name: "7 Days" });
        const buttons = panel.getByRole("list").getByRole("button");
        await buttons.first().focus();

        await page.keyboard.press("Tab");
        await expect(buttons.nth(1)).toBeFocused();
      });
    });

    describe("When selecting a day", () => {
      test("I expect to see that day's information", async ({ page }) => {
        const panel = page.getByRole("tabpanel", { name: "7 Days" });
        const buttons = panel.getByRole("list").getByRole("button");
        await buttons.first().focus();

        await page.keyboard.press("Space");
        await expect(buttons.first()).toHaveAttribute("aria-expanded", "true");

        const day = panel.getByRole("list").getByRole("listitem").first();
        const forecast = day.getByRole("heading", { name: "Hourly forecast" });

        await expect(forecast).toBeVisible();
      });
    });
  });

  describe("When viewing my hourly forecast", () => {
    test("I expect 7 alerts at the top of the page", async ({ page }) => {
      await expect(page.getByRole("alert")).toHaveCount(7);
    });

    describe("to check the hours for the alerts (on desktop)", () => {
      test.beforeEach(({}, testInfo) => {
        test.skip(testInfo.project.use.mobile);
      });

      test("I expect 5 alert rows in the hourly forecast table", async ({
        page,
      }) => {
        await expect(
          page.getByRole("rowheader", { name: "ALERT" }),
        ).toHaveCount(5);
      });

      test("I expect a Red Flag alert of the correct duration", async ({
        page,
      }) => {
        // We expect there to be a red-flag alert that spans two hours
        // and that contains the correct event label
        const alert = page.getByRole("cell", { name: "Red Flag Warning" });
        const index = await alert.evaluate((c) => c.cellIndex);

        await expect(index).toEqual(1); // zero-indexed
        await expect(alert).toHaveAttribute("colspan", "4");
      });

      describe("When I click the Red Flag alert", () => {
        test("I expect to navigate to the alerts tab", async ({ page }) => {
          const alert = page.getByRole("cell", { name: "Red Flag Warning" });
          const link = alert.getByRole("link", { name: "Red Flag Warning" });
          await link.click();

          const tab = page.getByRole("tab", { name: "Alerts" });
          await expect(tab).toHaveAttribute("aria-expanded", "true");

          const heading = page.getByRole("heading", {
            name: "Red Flag Warning",
          });
          await expect(heading).toBeVisible();
          const toggle = page.getByRole("button", { name: "Red Flag Warning" });
          await expect(toggle).toHaveAttribute("aria-expanded", "true");
        });
      });

      test("I expect a Special Weather Statement that begins in the third hour and spans 5 hours", async ({
        page,
      }) => {
        const alert = page.getByRole("cell", {
          name: "Special Weather Statement",
        });
        const spacing = alert.locator("//preceding-sibling::td");

        await expect(spacing).toHaveAttribute("colspan", "3");
        await expect(alert).toHaveAttribute("colspan", "6");
      });

      test("I expect a blizzard warning starting tomorrow", async ({
        page,
      }) => {
        await page
          .getByRole("tab", { name: new RegExp(tomorrow(), "i") })
          .click();

        const alert = page.getByRole("cell", { name: "Blizzard Warning" });
        const spacing = alert.locator("//preceding-sibling::td");

        await expect(spacing).toHaveAttribute("colspan", "10");
        await expect(alert).toHaveAttribute("colspan", "15");
      });
    });

    describe("to check the hours for the alerts (on mobile)", () => {
      test.beforeEach(async ({}, testInfo) => {
        test.skip(!testInfo.project.use.mobile);
      });

      test("I expect 5 alert rows in the hourly forecast table", async ({
        page,
      }) => {
        await page.getByRole("heading", { name: /Today/i }).click();
        await expect(
          page.getByRole("rowheader", { name: "ALERT" }),
        ).toHaveCount(5);
      });

      test("I expect a Red Flag alert of the correct duration", async ({
        page,
      }) => {
        await page.getByRole("heading", { name: /Today/i }).click();

        // We expect there to be a red-flag alert that spans two hours
        // and that contains the correct event label
        const alert = page.getByRole("cell", { name: "Red Flag Warning" });
        const index = await alert.evaluate((c) => c.cellIndex);

        await expect(index).toEqual(1); // zero-indexed
        await expect(alert).toHaveAttribute("colspan", "4");
      });

      describe("When I click the Red Flag alert", () => {
        test("I expect to navigate to the alerts tab", async ({ page }) => {
          await page.getByRole("heading", { name: /Today/i }).click();

          const alert = page.getByRole("cell", { name: "Red Flag Warning" });
          const link = alert.getByRole("link", { name: "Red Flag Warning" });
          await link.click();

          const tab = page.getByRole("tab", { name: "Alerts" });
          await expect(tab).toHaveAttribute("aria-expanded", "true");

          const heading = page.getByRole("heading", {
            name: "Red Flag Warning",
          });
          await expect(heading).toBeVisible();
          const toggle = page.getByRole("button", { name: "Red Flag Warning" });
          await expect(toggle).toHaveAttribute("aria-expanded", "true");
        });
      });

      test("I expect a Special Weather Statement that begins in the third hour and spans 5 hours", async ({
        page,
      }) => {
        await page.getByRole("heading", { name: /Today/i }).click();

        const alert = page.getByRole("cell", {
          name: "Special Weather Statement",
        });
        const spacing = alert.locator("//preceding-sibling::td");

        await expect(spacing).toHaveAttribute("colspan", "3");
        await expect(alert).toHaveAttribute("colspan", "6");
      });

      test("I expect a blizzard warning starting tomorrow", async ({
        page,
      }) => {
        await page
          .getByRole("heading", { name: new RegExp(tomorrow(), "i") })
          .click();

        const alert = page.getByRole("cell", { name: "Blizzard Warning" });
        const spacing = alert.locator("//preceding-sibling::td");

        await expect(spacing).toHaveAttribute("colspan", "10");
        await expect(alert).toHaveAttribute("colspan", "15");
      });
    });
  });

  describe("When viewing my precipitation table", () => {
    describe("to check how much rain and snow will fall (on desktop)", () => {
      test.beforeEach(async ({}, testInfo) => {
        test.skip(testInfo.project.use.mobile);
      });

      test("I expect a different amount each day", async ({ page }) => {
        let table = page.getByRole("table", {
          name: "precipitation amounts for the coming hours",
        });
        let row = table.getByRole("row").last();
        const waterToday = row.getByRole("cell").last();

        await expect(waterToday).toHaveText(/(0|\d+.\d+)"/);

        await page
          .getByRole("tab", { name: new RegExp(tomorrow(), "i") })
          .click();

        table = page.getByRole("table", {
          name: "precipitation amounts for the coming hours",
        });
        row = table.getByRole("row").last();
        const waterTomorrow = row.getByRole("cell").last();

        await expect(waterTomorrow).toHaveText(/(0|\d+.\d+)"/);
        await expect(waterToday.innerText()).not.toEqual(
          waterTomorrow.innerText,
        );
      });
    });

    describe("to check how much rain and snow will fall (on mobile)", () => {
      test.beforeEach(async ({}, testInfo) => {
        test.skip(!testInfo.project.use.mobile);
      });

      test("I expect a different amount each day", async ({ page }) => {
        let button = page.getByRole("heading", { name: /Today/i });
        await button.click();

        let drawer = button.locator("//following-sibling::div");
        let table = drawer.getByRole("table", {
          name: "precipitation amounts for the coming hours",
        });
        let row = table.getByRole("row").last();
        const waterToday = row.getByRole("cell").last();

        await expect(waterToday).toHaveText(/(0|\d+.\d+)"/);

        button = page.getByRole("heading", {
          name: new RegExp(tomorrow(), "i"),
        });
        await button.click();

        drawer = button.locator("//following-sibling::div");
        table = drawer.getByRole("table", {
          name: "precipitation amounts for the coming hours",
        });
        row = table.getByRole("row").last();
        const waterTomorrow = row.getByRole("cell").last();

        await expect(waterTomorrow).toHaveText(/(0|\d+.\d+)"/);
        await expect(waterToday.innerText()).not.toEqual(
          waterTomorrow.innerText,
        );
      });
    });
  });
});
