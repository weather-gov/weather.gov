const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');


const TWIG_T_FUNCTION_RX = /\{\{\s*t\(['"][^'"]*['"].*\)\}\}/sg;
const TWIG_T_FILTER_RX = /\{\{\s*['"]([^'"]*)['"]\s*\|\s*t(\(\s*(\{[^}]+\})\s*\))?\s*\}\}\n/sg;
const PHP_T_FUNCTION_RX = /-\>t\(.*\)/sg;

/**
 * Get all the individual paths for template files
 * in our custom theme
 */
const getTemplatePaths = sourceDir => {
  const globPattern = path.resolve(sourceDir, "**/*.twig");
  return globSync(globPattern);
};

/**
 * For a given template file, extract all of the
 * translation matches and return information about
 * the match line number and string
 */
const extractTemplateTranslations = filePath => {
  const source = fs.readFileSync(filePath).toString();
  let result = [];
  const functionMatches = source.matchAll(TWIG_T_FUNCTION_RX);
  if(functionMatches){
    result = result.concat(Array.from(
      functionMatches,
      match => {
        return {
          filename: path.basename(filePath),
          matchedString: match[0],
          extracted: match[1],
          extractedArgs: match[3] | null,
          lineNumber: getLineNumberForPosition(source, match.index)
        };
      }));
  }
  const filterMatches = source.matchAll(TWIG_T_FILTER_RX);
  if(filterMatches){
    result = result.concat(Array.from(
      filterMatches,
      match => {
        return {
          filename: path.basename(filePath),
          matchedString: match[0],
          extracted: match[1],
          extractedArgs: match[3] || null,
          lineNumber: getLineNumberForPosition(source, match.index)
        };
      }));
  }

  return result;
};

/**
 * For a given source string and an index into that
 * string, determine which line number of the source
 * the position appears at.
 */
const getLineNumberForPosition = (source, position) => {
  let cursor = 0;
  const lines = source.split("\n");
  for(let i = 0; i < lines.length; i++){
    const currentLine = lines[i];
    cursor += currentLine.length + 1; // Add the newline char
    if(position <= cursor){
      return i + 1; // Editors use index-1 for line counting
    }
  }

  return -1;
};

/**
 * Appends the value to the lookup dictionary's
 * key. Because keys map to arrays, if there is not
 * yet an entry for the key, it creates the initial array
 * value and sets the passed-in value as the first element.
 */
const appendToLookup = (lookup, key, val) => {
  if(!Object.keys(lookup).includes(key)){
    lookup[key] = [val];
  } else {
    lookup[key].push(val);
  }
};

/**
 * Given a source path of templates, return a lookup
 * dictionary that maps string to be translated to
 * arrays of match information.
 */
const getTemplateMatchInfo = dirPath => {
  const lookupByTerm = {};
  const sourcesPath = path.resolve(__dirname, dirPath);
  const templates = getTemplatePaths(sourcesPath);

  templates.forEach(filePath => {
    const parsed = extractTemplateTranslations(filePath);
    if(parsed.length){
      parsed.forEach(translateMatch => {
        appendToLookup(lookupByTerm, translateMatch.extracted, translateMatch);
      });
    }
  });

  return lookupByTerm;
};

module.exports = {
  getTemplateMatchInfo
};
