const { globSync } = require("glob");
const path = require("path");
const { getFileMatchInfo } = require("./translationExtraction");
const { getTranslationMatchInfo } = require("./gettextExtraction");
const config = require("./config.js");


/**
 * Get all of the template and php paths as flat arrays
 */
const templatePaths = config.templates.include.reduce((prev, current) => {
  const relativeGlob = path.resolve(__dirname, current);
  const filePaths = globSync(relativeGlob);
  return prev.concat(filePaths);
},[]).filter(filePath => {
  const fileName = path.basename(filePath);
  return !config.templates.exclude.includes(fileName);
});
const phpPaths = config.php.include.reduce((prev, current) => {
  const relativeGlob = path.resolve(__dirname, current);
  const filePaths = globSync(relativeGlob);
  return prev.concat(filePaths);
}, []).filter(filePath => {
  const fileName = path.basename(filePath);
  return !config.php.exclude.includes(fileName);
});
const translationPaths = config.translations.include.reduce((prev, current) => {
  const relativeGlob = path.resolve(__dirname, current);
  const filePaths = globSync(relativeGlob);
  return prev.concat(filePaths);
}, []).filter(filePath => {
  const fileName = path.basename(filePath);
  return !config.translations.exclude.includes(fileName);
});

const templateLookup = getFileMatchInfo(templatePaths, phpPaths);
const translationLookup = getTranslationMatchInfo(translationPaths);
const languages = Object.keys(translationLookup);
let errorsSummary = [];

languages.forEach(langCode => {
  console.log(`Checking translation integrity for: ${langCode}`);
  // First get any translations defined in templates
  // that are missing from the translation file for this
  // language
  const translations = translationLookup[langCode];
  const translationTerms = Object.keys(translations);
  const templateTerms = Object.keys(templateLookup);

  let fileNames = new Set();
  templateTerms.forEach(key => {
    templateLookup[key].forEach(phrase => {
      fileNames.add(phrase.filename);
    });
  });

  console.log("Checking for missing translations");
  const missing = templateTerms.filter(key => {
    return !translationTerms.includes(key);
  });

  if(missing.length){
    const errString = `Missing [${missing.length}] translations in the ${langCode} translations file`;
    errorsSummary.push(errString);
    console.error(errString + ":");
    missing.forEach(key => {
      const entryList = templateLookup[key];
      if(entryList){
        const fileLocations = entryList.map(entry => {
          return `${entry.filename}:${entry.lineNumber}`;
        });
        const serialized = JSON.stringify(entryList, null, 2);
        console.error(`${fileLocations.join("\n")}\n${serialized}`);
      }
    });
    process.exit(-1);
  }

  console.log("Checking for stale translations");
  const stale = translationTerms.filter(key => {
    return !templateTerms.includes(key);
  });

  if(stale.length){
    console.warn(`Found ${stale.length} potentially stale translations in the ${langCode} file`);
    console.log(stale);
  }
});
