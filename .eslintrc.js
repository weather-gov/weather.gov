module.exports = {
  root: true,
  extends: ["airbnb-base", "prettier"],
  ignorePatterns: ["tests/translations/**/*.js", "uswds*.js"],
  rules: {
    // For imports in the browser, file extensions are always required.
    "import/extensions": ["error", "always"],
    // eslint can't resolve remote imports, so ignore anything that starts
    // with https.
    "import/no-unresolved": ["error", { ignore: ["^https://"] }],
    "prefer-destructuring": [0],
    "no-param-reassign": ["error", { props: false }],
    "no-console": "error",
    // This rule forces us to use object spread operators instead of
    // Object.assign. I disagree, and see the latter as the clearer method
    "prefer-object-spread": [0],
    // Taken directly from airbnb, but with the for...of statements allowed. It
    // is now supported by all the browsers.
    "no-restricted-syntax": [
      "error",
      {
        selector: "ForInStatement",
        message:
          "for..in loops iterate over the entire prototype chain, which is virtually never what you want. Use Object.{keys,values,entries}, and iterate over the resulting array.",
      },
      {
        selector: "LabeledStatement",
        message:
          "Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand.",
      },
      {
        selector: "WithStatement",
        message:
          "`with` is disallowed in strict mode because it makes code impossible to predict and optimize.",
      },
    ],
  },
  env: {
    es6: true,
    browser: true,
  },
  parserOptions: { ecmaVersion: 2024 },
  overrides: [
    {
      files: ["web/themes/new_weather_theme/assets/js/components/**/*.js"],
      rules: {
        "class-methods-use-this": 0,
      },
    },
    {
      files: [
        "api-interop-layer/**/*.test.js",
        "web/themes/new_weather_theme/tests/**/*.js",
      ],
      extends: ["airbnb-base", "prettier"],
      parserOptions: { ecmaVersion: 2024 },
      rules: {
        // This rule disallows using require() on files in devDependencies. But
        // for test code, we'll rely on that heavily so we can disable the rule
        // in here.
        "import/no-extraneous-dependencies": [0],

        // For imports in Node, file extensions are optional and discouraged as
        // a matter of practice.
        "import/extensions": ["error", "always"],

        // chai provides "empty" expressions, such as `to.be.true`
        "no-unused-expressions": "off",
      },
      env: { mocha: true },
    },
    {
      files: [
        "tests/**/*.js",
        "spatial-data/**/*.js",
        "web/**/tests/**/*.js",
        "playwright.config.js",
      ],
      extends: ["airbnb-base", "prettier"],
      env: {
        es6: true,
        jest: true,
      },
      parserOptions: { ecmaVersion: 2024 },
      rules: {
        "no-console": 0,

        // For imports in Node, file extensions are optional and discouraged as
        // a matter of practice.
        "import/extensions": [0],

        // This rule disallows using require() on files in devDependencies. But
        // for test code, we'll rely on that heavily so we can disable the rule
        // in here.
        "import/no-extraneous-dependencies": [0],

        // Allow reassignment of parameter properties, but not the parameters
        // themselves.
        "no-param-reassign": ["error", { props: false }],

        // Taken directly from airbnb, but with the for...of statements allowed
        // since we know it is supported in Node.js. We may extend this grace
        // to clientside Javascript after we pick our browser support levels.
        "no-restricted-syntax": [
          "error",
          {
            selector: "ForInStatement",
            message:
              "for..in loops iterate over the entire prototype chain, which is virtually never what you want. Use Object.{keys,values,entries}, and iterate over the resulting array.",
          },
          {
            selector: "LabeledStatement",
            message:
              "Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand.",
          },
          {
            selector: "WithStatement",
            message:
              "`with` is disallowed in strict mode because it makes code impossible to predict and optimize.",
          },
        ],
      },
    },
  ],
};
