const { getFileMatchInfo, getPHPPaths } = require("./translationExtraction");
const { getTranslationMatchInfo } = require("./gettextExtraction");

const reportUsage = () => {
  const output = `Usage: ${__filename.split("/").pop()} [PATH_TO_TEMPLATE_DIR] [PATH_TO_PHP_FILES_DIR] [PATH_TO_TRANSLATIONS_DIR]`;
  console.log(output);
}

// Parse out translation tags/filters from the templates
// and get an initial lookup dictionary about the matches.
const TEMPLATE_PATH = process.argv[2];
const PHP_PATH = process.argv[3];
const TRANS_PATH = process.argv[4];
if(!TEMPLATE_PATH || !TRANS_PATH || !PHP_PATH){
  reportUsage();
  process.exit(-1);
}

const templateLookup = getFileMatchInfo(TEMPLATE_PATH, PHP_PATH);
const translationLookup = getTranslationMatchInfo(TRANS_PATH);
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

  console.log(Array.from(fileNames).sort());

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
  }

  console.log("Checking for stale translations");
  const stale = translationTerms.filter(key => {
    return !templateTerms.includes(key);
  });

  if(stale.length){
    console.error(`Found ${stale.length} stale translations in the ${langCode} file`);
  }

  console.log(
    templateTerms.find(term => term.startsWith("There"))
  );
});
