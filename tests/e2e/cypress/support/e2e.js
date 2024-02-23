// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import "./commands";
import "cypress-plugin-tab";
// Alternatively you can use CommonJS syntax:
// require('./commands')

Cypress.Commands.overwrite("visit", (originalFn, url, options) => {
  const opts = { ...options };
  opts.qs = { ...opts.qs, coverage: true };

  return originalFn(url, opts);
});

Cypress.Commands.overwrite("request", (originalFn, url, options) => {
  const opts = (() => {
    if (options) {
      return { url, ...options };
    }
    if (typeof url === "object") {
      return { ...url };
    }
    return { url };
  })();
  opts.qs = { ...opts.qs, coverage: true };

  return originalFn(opts);
});
