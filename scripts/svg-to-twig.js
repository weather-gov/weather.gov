/**
 * SVG to twig
 * ------------------------------
 * This script converts SVG (XML) files into twig
 * templates that can be used by our custom Drupal theme
 * to generate SVGs with custom classes, attributes, and
 * even nested contextual elements.
 *
 * The primary use case is in the customization of
 * ARIA/accessibility related attributes.
 */
const fs = require('fs');
const path = require('path');
const xml = require('xml-parse');


// The root of the template partials
// directory for our theme
const partialsRoot = path.resolve(
  __dirname,
  "..",
  "web/themes/new_weather_theme/templates/"
);

// Grab the passed-in filenames from the command
// line. These should have been provided from a glob
// pattern.
const inputPaths = process.argv.slice(2);

// The twig template comment that will
// be present at the top of each file
const templateComment = `{#
/**
* @file
* Partial for rendering an accessible svg image inline
*
* Available variables:
* - label: The label of the image, used for accessibility
* - classNames: A space-separated list of class values for the outer svg element
*/
#}

`;

const modifyAttributes = (svgElementObject) => {
  const { attributes } = svgElementObject;
  if(attributes.class){
    attributes.class = `${attributes.class} {{ classNames }}`;
  } else {
    attributes.class = `{{ classNames }}`;
  }
};

const removeXMLDeclaration = (xmlStr) => {
  const lines = xmlStr.split("\n");
  if(lines[0].startsWith("<?xml")){
    return lines.slice(1).join("\n");
  }
  return xmlStr;
};

const getOutputPath = (inputPathStr) => {
  const parts = inputPathStr.split("/");
  const index = parts.indexOf('icons');
  const resultParts = parts.slice(index);
  const trimmedPath = resultParts.join("/");
  const baseName = path.basename(trimmedPath, ".svg");
  return path.resolve(
    partialsRoot,
    path.dirname(trimmedPath),
    `${baseName}.html.twig`
  );
};

const cleanupWhitespace = (str) => {
  const lines = str.split("\n");
  return lines.map(line => {
    return line.replace(/^\w+\n$/, "");
  }).filter(line => {
    return line !== "";
  }).join("\n");
}

inputPaths.forEach(inputPath => {
  const outputPath = getOutputPath(inputPath);
  const fp = fs.readFileSync(path.resolve(__dirname, "..", inputPath), "utf8");
  const xmlString = fp.toString();
  const document = xml.parse(xmlString);
  const svgElementObject = document.find(element => element.tagName == 'svg');
  modifyAttributes(svgElementObject);
  let output = removeXMLDeclaration(xml.stringify(document, 2));
  const matchedStr = output.match(/\<svg[^>]+/)[0];
  if(matchedStr){
    const templateStr = `{% if label %} aria-label="{{ label }}"{% endif %}`;
    const updatedStr = `${matchedStr}${templateStr}`;
    output = output.replace(matchedStr, updatedStr);
  }
  output = cleanupWhitespace(output);
  output = `${templateComment}\n${output}`;
  fs.writeFileSync(outputPath, output);
  console.log(`Wrote: ${outputPath}`);
});
