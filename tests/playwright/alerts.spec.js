const { test, expect } = require("@playwright/test");
const { describe, beforeEach } = test;

describe("Alerts e2e tests", () => {
  beforeEach(async ({ page }) => {
    await page.goto("http://localhost:8081/play/testing");
    await page.goto("/point/34.749/-92.275");
  });

  test("The correct number of alerts show on the page", async ({ page }) => {
    const alertAccordions = await page.locator("weathergov-alerts div.usa-accordion").all();
    expect(alertAccordions).toHaveLength(7);
  });

  test("All alert accordions are open by default", async ({ page }) => {
    const alertAccordions = await page.locator('weathergov-alerts div.usa-accordion button[aria-expanded="true"]').all();
    expect(alertAccordions).toHaveLength(7);
  });

  test("Clicking the alert accordion buttons closes them", async ({ page }) => {
    const alertAccordions = page.locator("weathergov-alerts div.usa-accordion button");
    for(let i = 0; i < await alertAccordions.count(); i++){
      await alertAccordions.nth(i).click();
      await expect(alertAccordions.nth(i)).toHaveAttribute("aria-expanded", "false");
    }
  });
});
