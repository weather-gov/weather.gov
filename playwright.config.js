// @ts-check
const { defineConfig, devices } = require("@playwright/test");
const services = require("./tests/playwright/urls.js");


/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * @see https://playwright.dev/docs/test-configuration
 */
const config = {
  testDir: "./tests/playwright/e2e",
  /* Run tests in files in parallel */
  //fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI ? "line" : "html",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: services.webURL,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",

    /**
     * Look, computers these days are just too fast,
     * especially when it comes to testing interactions
     * in the browser. The `slowMo` option adds delays to
     * _all_ interactive actions (clicks, navigations, etc)
     * in order to better capture custom event handling,
     * like we have with our web
     */
    launchOptions: {
      slowMo: 100
    }
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium-e2e",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /api.spec.js/,
    },

    // since we are running API tests, we really only need one browser
    // {
    //   name: "chromium",
    //   use: { ...devices["Desktop Chrome"] },
    //   testMatch: /api.spec.js/,
    // },

    // {
    //   name: "firefox",
    //   use: { ...devices["Desktop Firefox"] },
    // },

    // {
    //   name: "webkit",
    //   use: { ...devices["Desktop Safari"] },
    //   testIgnore: /api.spec.js/,
    // },

    /* Test against mobile viewports. */
    // {
    //   name: "Mobile Chrome",
    //   use: { ...devices["Pixel 5"] },
    //   testIgnore: /api.spec.js/,
    // },
    // Mobile Safari is excluded in CI because it tends to fail when it's
    // containerized.

    /* Test against branded browsers. */
    // {
    //   name: "Microsoft Edge",
    //   use: { ...devices["Desktop Edge"], channel: "msedge" },
    //   testIgnore: /api.spec.js/,
    // },

    {
      name: "Google Chrome",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
      testIgnore: /api.spec.js/,
    },
  ],
};

// if (!process.env.CI) {
//   config.projects.push({
//     name: "Mobile Safari",
//     use: { ...devices["iPhone 12"] },
//     testIgnore: /api.spec.js/,
//   });
// }

module.exports = defineConfig(config);
