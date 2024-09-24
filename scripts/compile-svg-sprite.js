const fs = require('fs');
const path = require('path');
const Jsdom = require('jsdom').JSDOM;

// Grab the passed-in filenames from the command
// line. These should have been provided from a glob
// pattern.
const inputPaths = process.argv.slice(2);

// The directory where the output svg should
// be placed when compiled
const outputPath = path.resolve(
  __dirname,
  "..",
  "web/themes/new_weather_theme/assets/images/",
  "spritesheet.svg"
);

// We use a global JSDOM instance for
// easily manipulating the elements as
// we create them. This also parses the XML
// easily into HTML friendly SVG.
const dom = new Jsdom(`<!DOCTYPE html><html><head></head>/><body></body>/></html>`);
const window = dom.window;
const document = window.document;

const getBasename = (filepath) => {
  return path.basename(filepath, ".svg");
};

/**
 * Given a path filename, make the
 * basename into an id-friendly string
 *
 * @param str string | path The filename or path
 * @return string An id-friendly string
 */
const filenameToId = (str) => {
  const basename = getBasename(str).toLowerCase();
  return basename.replace(/\s/g, "-");
};

/**
 * Removes extra lines from string
 *
 * @param str string The source string
 * @return string A string with extraneous
 * newlines removed
 */
const cleanupWhitespace = (str) => {
  const lines = str.split("\n");
  return lines.map(line => {
    return line.replace(/^\w+\n$/, "");
  }).filter(line => {
    return line !== "";
  }).join("\n");
};

/**
 * Removes any inline style tags
 *
 * @param str string The source string
 * @return string A string with any inline style
 * tags removed from the SVG XML.
 */
const removeStyleTags = (str) => {
  return str.replace(/<style[\w\W]*?<\/style>\n/gm, '');
};

/**
 * Removes the XML header from the string
 *
 * @param str string The source xml string
 * @return string The cleaned output xml string
 */
const removeXMLDeclaration = str => {
  return str.replace(/\n<?xml[^\n]*/gm, "");
};

/**
 * Remove class attributes from elements
 *
 * Class references can leak out into other
 * parts of the DOM without indication in the
 * devtools, which is annoying.
 *
 * @param str string The source XML string
 * @return string The cleaned output XML string
 */
const removeClassAttributes = str => {
  return str.replace(/class="st0"/g, "");
};

/**
 * For an array of input paths, parse the XML
 * and return a spritesheet formatted <symbol>
 *
 * @param inputPaths [string] A collection of svg filepaths
 * @return [string] A collection of strings that are <symbol> xml fragments
 */
const getSymbolDefsFromPaths = inputPaths => {
  return inputPaths.map(inputPath => {
    const fp = fs.readFileSync(
      path.resolve(__dirname, "..", inputPath),
      'utf8'
    );
    const xmlString = fp.toString();
    const container = document.createElement('div');
    container.innerHTML = xmlString;
    const svgEl = container.querySelector('svg');
    const symbolEl = document.createElement('symbol');
    symbolEl.setAttribute(
      'viewBox',
      svgEl.getAttribute('viewBox')
    );
    symbolEl.setAttribute('id', filenameToId(inputPath));
    symbolEl.innerHTML = svgEl.innerHTML;
    let outputStr = symbolEl.outerHTML;
    outputStr = outputStr.replace(/\<svg/, "<symbol");
    outputStr = outputStr.replace(/<\/svg/, "</symbol");
    outputStr = outputStr.replace(/viewbox/g, "viewBox");
    outputStr = cleanupWhitespace(outputStr);
    outputStr = removeXMLDeclaration(outputStr);
    outputStr = removeStyleTags(outputStr);
    outputStr = removeClassAttributes(outputStr);
    return outputStr;
  });
};

// Main
const symbols = getSymbolDefsFromPaths(inputPaths).join("\n");
const outputString = `<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg">
  <defs>
    ${symbols}
  </defs>
</svg>`;
fs.writeFileSync(outputPath, outputString);
console.log(`Wrote ${outputPath}`);
