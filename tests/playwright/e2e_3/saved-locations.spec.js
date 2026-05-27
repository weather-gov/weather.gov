const { test, expect } = require("@playwright/test");
const services = require("../urls.js");
const { describe, beforeEach } = test;

describe("Saved Locations Tests", () => {
  beforeEach(async ({ page }) => {});
  test("front page does not show saved location when empty", async ({
    page,
  }) => {
    await page.goto(services.webApp("/"), {
      waitUntil: "load",
    });
    const search = await page.getByRole("button", { name: "Search" });
    const selectorFront = await page.getByTestId(
      "wx-saved-locations-section--front",
    );
    const selectorNav = await page.getByTestId(
      "wx-saved-locations-section--nav",
    );
    await expect(selectorFront).toBeHidden();
    search.click();
    await expect(selectorNav).toBeHidden();
  });

  test("forecast point page shows save locations button", async ({ page }) => {
    await page.goto(services.webApp("/forecast/point/34.749/-92.275"), {
      waitUntil: "load",
    });

    const button = await page.getByTestId("wx-saved-locations-button");
    const selectorPoint = await page.getByTestId(
      "wx-saved-locations-section--point",
    );
    const search = await page.getByRole("button", { name: "Search" });
    await expect(button).toBeVisible();
    await expect(selectorPoint).toBeHidden();
    search.click();
    const navsection = await page.getByRole("tabpanel");
    await expect(navsection).toBeVisible();
  });

  test("forecast point page click save locations button", async ({ page }) => {
    await page.goto(services.webApp("/forecast/point/34.749/-92.275"), {
      waitUntil: "load",
    });

    const button = await page.getByTestId("wx-saved-locations-button");
    const selectorPoint = await page.getByTestId(
      "wx-saved-locations-section--point",
    );
    const selectorNav = await page.getByTestId(
      "wx-saved-locations-section--nav",
    );
    const search = await page.getByRole("button", { name: "Search" });
    await expect(button).toBeVisible();
    await expect(selectorPoint).toBeHidden();
    await expect(button).toHaveAttribute("aria-checked", "false");
    button.click();
    await expect(button).toHaveAttribute("aria-checked", "true");
    await expect(selectorPoint).toBeVisible();
    search.click();
    const navsection = await page.getByRole("tabpanel");
    await expect(navsection).toBeVisible();
    await expect(selectorNav).toBeVisible();
  });

  test("forecast point page click save, then unsave locations button", async ({
    page,
  }) => {
    await page.goto(services.webApp("/forecast/point/34.749/-92.275"), {
      waitUntil: "load",
    });

    const button = await page.getByTestId("wx-saved-locations-button");
    const selectorPoint = await page.getByTestId(
      "wx-saved-locations-section--point",
    );
    const selectorNav = await page.getByTestId(
      "wx-saved-locations-section--nav",
    );
    const search = await page.getByRole("button", { name: "Search" });
    await expect(button).toBeVisible();
    await expect(button).toHaveAttribute("aria-checked", "false");
    await expect(selectorPoint).toBeHidden();
    button.click();
    await expect(selectorPoint).toBeVisible();
    await expect(button).toHaveAttribute("aria-checked", "true");
    search.click();
    const navsection = await page.getByRole("tabpanel");
    await expect(navsection).toBeVisible();
    await expect(selectorNav).toBeVisible();
    button.click(); // Click to unsave location
    await expect(selectorPoint).toBeVisible();
    await expect(button).toHaveAttribute("aria-checked", "false");
  });

  test("save multiple locations", async ({ page }) => {
    test.slow();
    await page.goto(services.webApp("/forecast/point/34.749/-92.275"), {
      waitUntil: "load",
    });

    const button = await page.getByTestId("wx-saved-locations-button");
    const selectorPoint = await page.getByTestId(
      "wx-saved-locations-section--point",
    );
    const selectorNav = await page.getByTestId(
      "wx-saved-locations-section--nav",
    );
    const search = await page.getByRole("button", { name: "Search" });
    const searchClose = await page.getByRole("button", { name: "Close" });

    await expect(button).toBeVisible();
    await expect(button).toHaveAttribute("aria-checked", "false");
    await expect(selectorPoint).toBeHidden();
    button.click();
    await expect(button).toHaveAttribute("aria-checked", "true");
    await expect(selectorPoint).toBeVisible();
    await expect(selectorPoint.getByRole("listitem")).toHaveCount(1);

    await page.goto(services.webApp("/forecast/point/39.051/-95.67"), {
      waitUntil: "load",
    });
    await expect(button).toBeVisible();
    button.click();
    await expect(selectorPoint.getByRole("listitem")).toHaveCount(2);

    search.click();
    await expect(selectorNav.getByRole("listitem")).toHaveCount(2);
    searchClose.click();
  });
});
