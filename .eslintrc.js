module.exports = {
  extends: ["airbnb-base", "prettier"],
  ignorePatterns: ["uswds*.js"],
  rules: {
    "prefer-destructuring": [0],
  },
  env: {
    es6: true,
    browser: true,
  },
  parserOptions: { ecmaVersion: 2021 },
  overrides: [
    {
      files: ["*.test.js"],
      env: {
        jest: true,
      },
    },
  ],
};
