const {stringify} = require("csv-stringify/sync");
const fs = require("fs");
const path = require("path");

function reportUsage(){
  console.log(`Usage:\n\t po-to-csv [path-to-po-file] [path-to-output-csv]`);
}

function parseMsgtextString(source){
  const blocks =  source.split("\n\n").slice(1);
  return blocks.map(block => {
    let labelMatch = block.match(/#\:\s+(.*)\n/, block);
    let label = "";
    if(labelMatch){
      label = labelMatch[1];
    }
    let idMatch = block.match(/msgid\s*["]([^"]+)["]/s);
    let id = "";
    if(idMatch){
      id = idMatch[1];
    }
    let strMatch = block.match(/msgstr\s*["]([^"]*)["]/s);
    let str = "";
    if(strMatch){
      str = strMatch[1];
    }

    return {
      label,
      en: id,
      translation: str
    };
  });
}

if(process.argv.length < 4){
  reportUsage();
  process.exit(-1);
}

const inputPath = path.resolve(process.argv[2]);
const outputPath = path.resolve(process.argv[3]);

const sourceString = fs.readFileSync(inputPath).toString();
const parsedInput = parseMsgtextString(sourceString);

const outString = stringify(
  parsedInput,
  {header: true}
);

// Write the output file
const filename = path.basename(outputPath);
fs.writeFileSync(
  outputPath,
  outString
);
console.log(`Wrote ${filename}`);



