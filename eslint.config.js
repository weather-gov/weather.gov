const { defineConfig, globalIgnores } = require("eslint/config");

const globals = require("globals");
const js = require("@eslint/js");

const { FlatCompat } = require("@eslint/eslintrc");

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

module.exports = defineConfig([
  {
    rules: {
      "prefer-destructuring": [0],

      "no-param-reassign": [
        "error",
        {
          props: false,
        },
      ],

      "no-console": "error",
      "prefer-object-spread": [0],

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

      "class-methods-use-this": "off",
    },

    languageOptions: {
      globals: {
        ...globals.browser,
      },

      ecmaVersion: 2024,
      parserOptions: {},
    },
  },
  globalIgnores([
    "reports/**/*",
    "forecast/frontend/assets/js/cmi-radar.*.js",
    "forecast/frontend/assets/js/third-party/*",
    "tests/translations/**/*.js",
    "**/uswds*.js",
    "web/sites/default/**/*",
    "**/gulpfile.js",
    "forecast/frontend/public/*",
  ]),
  {
    files: ["web/themes/new_weather_theme/assets/js/components/**/*.js"],

    rules: {
      "class-methods-use-this": 0,
    },
  },
  {
    files: [
      "api-interop-layer/**/*.test.js",
      "forecast/frontend/tests/**/*.js",
    ],

    languageOptions: {
      ecmaVersion: 2024,
      parserOptions: {},

      globals: {
        ...globals.mocha,
      },
    },

    rules: {
      "no-unused-expressions": "off",

      "no-unused-vars": [
        "error",
        {
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: [
      "api-interop-layer/**/*.js",
      "tests/**/*.js",
      "spatial-data/**/*.js",
      "web/**/tests/**/*.js",
      "**/playwright.config.js",
      "forecast/frontend/**/*.js",
    ],

    languageOptions: {
      globals: {
        ...globals.jest,
      },

      ecmaVersion: 2024,
      parserOptions: {},
    },

    rules: {
      "no-console": 0,
      "no-undef": 0,

      "no-param-reassign": [
        "error",
        {
          props: false,
        },
      ],

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
]);
