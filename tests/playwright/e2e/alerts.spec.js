/* eslint-disable no-await-in-loop, no-plusplus */
const { test, expect } = require("@playwright/test");

const { describe, beforeEach } = test;

describe("Alerts e2e tests", () => {
  beforeEach(async ({ page }) => {
    await page.goto("http://localhost:8081/play/testing");
    await page.goto("/point/34.749/-92.275");
  });

  test("The correct number of alerts show on the page", async ({ page }) => {
    const alertAccordions = await page.locator("wx-alerts div.usa-accordion").all();
    expect(alertAccordions).toHaveLength(6);
  });

  test("All alert accordions are open by default", async ({ page }) => {
    const alertAccordions = await page.locator('wx-alerts div.usa-accordion button[aria-expanded="true"]').all();
    expect(alertAccordions).toHaveLength(6);
  });

  test("Clicking the alert accordion buttons closes them", async ({ page }) => {
    const alertAccordions = page.locator("wx-alerts div.usa-accordion button");
    for(let i = 0; i < await alertAccordions.count(); i++){
      await alertAccordions.nth(i).click();
      await expect(alertAccordions.nth(i)).toHaveAttribute("aria-expanded", "false");
    }
  });

  describe("Parsed URLs in alerts", () => {
    test("Should not find a link wrapping the non-gov url", async ({ page }) => {
      const containingText = page.locator("wx-alerts").getByText("www.your-power-company.com/outages");
      await expect(containingText).toHaveCount(1);

      const link = page.locator('a[href="www.your-power-company.com/outages"]');
      await expect(link).toHaveCount(0);
    });

    test("Should find a link wrapping the external url, and should have the correct class", async ({ page }) => {
      const containingText = page.locator("wx-alerts").getByText("https://transportation.gov/safe-travels");
      await expect(containingText).toHaveCount(1);

      const link = page.getByRole("link").filter({hasText: "https://transportation.gov/safe-travels"});
      await expect(link).toHaveCount(1);
      await expect(link).toHaveAttribute("href", "https://transportation.gov/safe-travels");
      await expect(link).toHaveClass(/usa-link--external/);
    });

    test("Should find a link wrapping the inernal url, and should have the correct class", async ({ page }) => {
      const containingText = page.locator("wx-alerts").getByText("https://weather.gov/your-office");
      await expect(containingText).toHaveCount(1);

      const link = page.getByRole("link").filter({hasText: "https://weather.gov/your-office"});
      await expect(link).toHaveCount(1);
      await expect(link).toHaveAttribute("href", "https://weather.gov/your-office");
      await expect(link).not.toHaveClass(/usa-link--external/);
    });
  });
});
