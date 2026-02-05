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
  testDir: "./tests/playwright",
  /* Run tests in files in parallel */
  //fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI
    ? "line"
    : [
        [
          "html",
          // Don't start Playwright's HTML server, and save the output to a
          // specific path based on the tests being run. The test suite to run
          // is specified by the last argument.
          {
            open: "never",
            outputFolder: `/reports/${process.argv.slice(-1).pop()}`,
          },
        ],
      ],
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
      slowMo: 100,
    },
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "Desktop Chrome",
      use: { ...devices["Desktop Chrome"] },
    },

    {
      name: "Desktop Firefox",
      use: { ...devices["Desktop Firefox"] },
    },

    {
      name: "Desktop Safari",
      use: { ...devices["Desktop Safari"] },
    },

    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
  ],
};

if (!process.env.CI) {
  // Mobile Safari is excluded in CI because it tends to fail
  config.projects.push({
    name: "Mobile Safari",
    use: { ...devices["iPhone 12"] },
  });
} else {
  // Branded Chromium browsers are excluded in dev because they aren't built
  // for ARM64 Linux, which our macOS-based dev environment uses. They should
  // work in the AMD64 CI/CD environment, though.
  config.projects.push({
    name: "Microsoft Edge",
    use: { ...devices["Desktop Edge"], channel: "msedge" },
  });

  config.projects.push({
    name: "Google Chrome",
    use: { ...devices["Desktop Chrome"], channel: "chrome" },
  });
}

module.exports = defineConfig(config);
