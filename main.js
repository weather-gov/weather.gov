const { getTemplateMatchInfo } = require("./translationExtraction");
const { getTranslationMatchInfo } = require("./gettextExtraction");

const reportUsage = () => {
  const output = `Usage: ${__filename.split("/").pop()} [PATH_TO_TEMPLATE_DIR] [PATH_TO_TRANSLATIONS_DIR]`;
  console.log(output);
}

// Parse out translation tags/filters from the templates
// and get an initial lookup dictionary about the matches.
const TEMPLATE_PATH = process.argv[2];
const TRANS_PATH = process.argv[3];
if(!TEMPLATE_PATH || !TRANS_PATH){
  reportUsage();
  process.exit(-1);
}

const templateLookup = getTemplateMatchInfo(TEMPLATE_PATH);
const translationLookup = getTranslationMatchInfo(TRANS_PATH);
const languages = Object.keys(translationLookup);

languages.forEach(langCode => {
  // First get any translations defined in templates
  // that are missing from the translation file for this
  // language
  const translations = translationLookup[langCode];
  const translationTerms = Object.keys(translations);
  const templateTerms = Object.keys(templateLookup);
  const missing = Object.keys(templateLookup).filter(key => {
    return !translationTerms.includes(key);
  });

  if(missing.length){
    console.log(`Missing [${missing.length}] translations in the ${langCode} translations file:`);
    missing.forEach(key => {
      const entry = templateLookup[key];
      if(entry){
        console.log(JSON.stringify(key));
        console.log(entry);
      }
    });
  }
});
