module.exports = {
  extends: ["airbnb-base", "prettier"],
  ignorePatterns: ["uswds*.js"],
  rules: {
    "prefer-destructuring": [0],
    "no-param-reassign": ["error", { props: false }],
  },
  env: {
    es6: true,
    browser: true,
  },
  parserOptions: { ecmaVersion: 2021 },
  overrides: [
    {
      files: ["cypress.config.js", "cypress/e2e/**/*.js"],
      extends: ["airbnb-base", "prettier", "plugin:cypress/recommended"],
      env: {
        jest: true,
      },
      rules: {
        // This rule disallows using require() on files in devDependencies. But
        // for test code, we'll rely on that heavily so we can disable the rule
        // in here.
        "import/no-extraneous-dependencies": [0],

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
