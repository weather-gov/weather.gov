const { globSync } = require("glob");
const path = require("path");
const { getFileMatchInfo } = require("./translationExtraction");
const { getTranslationMatchInfo } = require("./gettextExtraction");
const config = require("./config.js");

const RED_ERROR = "\x1b[31mError:\x1b[0m";
const YELLOW_WARNING = "\x1b[33mWarning:\x1b[0m";
const GREEN_SUCCESS = "\x1b[0;32mGood:\x1b[0m";

// Parse config file to get all of the template and php paths as flat arrays

/** Twig template locations. Defined in config.js. @type string[] */
const templatePaths = config.templates.include
  .reduce((prev, current) => {
    const relativeGlob = path.resolve(__dirname, current);
    const filePaths = globSync(relativeGlob);
    return prev.concat(filePaths);
  }, [])
  .filter((filePath) => {
    const fileName = path.basename(filePath);
    return !config.templates.exclude.includes(fileName);
  });
/** Translatable PHP file locations. Defined in config.js. @type string[] */
const phpPaths = config.php.include
  .reduce((prev, current) => {
    const relativeGlob = path.resolve(__dirname, current);
    const filePaths = globSync(relativeGlob);
    return prev.concat(filePaths);
  }, [])
  .filter((filePath) => {
    const fileName = path.basename(filePath);
    return !config.php.exclude.includes(fileName);
  });
/** Translation file (eg. `fr.po`) locations. Defined in config.js. @type string[] */
const translationPaths = config.translations.include
  .reduce((prev, current) => {
    const relativeGlob = path.resolve(__dirname, current);
    const filePaths = globSync(relativeGlob);
    return prev.concat(filePaths);
  }, [])
  .filter((filePath) => {
    const fileName = path.basename(filePath);
    return !config.translations.exclude.includes(fileName);
  });

/** Map of translation keys (message ids) to info about their occurrence in the code. */
const templateLookup = getFileMatchInfo(templatePaths, phpPaths);
/** Map of language codes to dictionaries of their translation keys and strings. */
const translationLookup = getTranslationMatchInfo(translationPaths);
/** Array of language filenames, like `fr.po`. */
const languages = Object.keys(translationLookup);

/** Any problems worth stopping a CI run? */
let hasErrors = false;

// Check the English translation file for missing or stale translation keys

/** Map of English translation keys (msgid) to msgstr, comments, etc. */
const english = translationLookup['en'];
/** Array of English translation keys. */
const translationKeys = Object.keys(english);
/** Array of strings marked for translation in Twig and PHP files. */
const translatable = Object.keys(templateLookup);

const ignore = new Set(config.suppress.missing.en ?? []);
const missing = translatable.filter((key) => !translationKeys.includes(key)).filter((key) => !ignore.has(key));

if (missing.length) {
  hasErrors = true;
  console.error(
    `${RED_ERROR} ${missing.length} strings are marked for translation but have no msgid in en.po`
  );
  missing.forEach((key) => {
    const entryList = templateLookup[key];
    if (entryList) {
      console.error(`\t"${entryList[0].extracted}"`);
      entryList.map(
        (entry) => console.error(`\t\t${entry.filename}:${entry.lineNumber}`)
      );
    }
  });
} else {
  console.log(`${GREEN_SUCCESS} No English translations are missing from en.po.`);
  console.log("Caution: This test won't help if you forget to mark a string for translation.");
}

const ignored = new Set(config.suppress.stale.en ?? []);
const stale = translationKeys.filter((key) => !translatable.includes(key)).filter((key) => !ignored.has(key));

if (stale.length) {
  console.warn(
    `${YELLOW_WARNING} ${stale.length} msgids are in en.po but do not seem to be used anywhere`
  );
  stale.forEach((key) => {
    console.warn(`\t"${key}"`);
  });
} else {
  console.log(`${GREEN_SUCCESS} All English translations in en.po are used in Twig or PHP`);
}

// Check each language for parity with the English translation file

languages.forEach((langCode) => {
  if (langCode === 'en') return;  // we already did this one

  const keyLookup = translationLookup[langCode];
  const comparisonKeys = Object.keys(keyLookup);
  const ignore = new Set(config.suppress.missing[langCode] ?? []);
  /** Translation keys in English which are missing or not translated in `langCode`. */
  const missing = translationKeys.filter(
    (key) => (!comparisonKeys.includes(key) || !keyLookup[key]?.msgstr)
  ).filter((key) => !ignore.has(key));
  if (missing.length) {
    hasErrors = true;
    console.error(
      `${RED_ERROR} ${missing.length} strings from en.po are not in ${langCode}.po`
    );
    missing.forEach((key) => console.error(`\t${key}\t${english[key].msgstr}`));
  } else {
    console.log(`${GREEN_SUCCESS} All strings from en.po are in ${langCode}.po.`);
  }

  const ignored = new Set(config.suppress.stale[langCode] ?? []);
  /** Translation keys in `langCode` which are missing in English. */
  const stale = comparisonKeys.filter((key) => !translationKeys.includes(key)).filter((key) => !ignored.has(key));
  if (stale.length) {
    console.warn(
      `${YELLOW_WARNING} ${stale.length} strings from ${langCode}.po are not in en.po`
    );
    stale.forEach((key) => console.warn(`\t"${key}"`));
  } else {
    console.log(`${GREEN_SUCCESS} All strings from ${langCode}.po are in en.po.`);
  }
});

if (hasErrors) {
  console.warn(`${YELLOW_WARNING} Exiting with errors.`);
  process.exit(-1);
}