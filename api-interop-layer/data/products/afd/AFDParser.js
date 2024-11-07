/* eslint-disable no-plusplus */
const SPECIAL_HEADER_TYPES = {
  wwa: {
    re: /^\.(?<header>[A-Z]{3}\sWATCHES\/WARNINGS\/ADVISORIES)[.]{3}/,
  },
  tempsTable: {
    re: /^\.(?<header>.*TEMPS\/POPS)[.]{3}/,
  }
};

const GENERIC_HEADER_REGEX = /^\.(?<header>.+)[.]{3}/;
const SUBHEADER_REGEX = /^\s*\.{3}(?<subheader>[^.]+)\.{3}/;


export default class AFDParser {
  constructor(str){
    this.source = str;
    this.parsedNodes = [];
    this.currentContentType = "generic";

    // Bound methods
    this.parse = this.parse.bind(this);
    this.parseDocumentPreamble = this.parseDocumentPreamble.bind(this);
    this.parseSection = this.parseSection.bind(this);
    this.parseHeader = this.parseHeader.bind(this);
    this.parseSubheader = this.parseSubheader.bind(this);
    this.parseTextContent = this.parseTextContent.bind(this);
    this.parseWWAContent = this.parseWWAContent.bind(this);
    this.parseTempsTableContent = this.parseTempsTableContent.bind(this);
    this.parseEpilogueContent = this.parseEpilogueContent.bind(this);
    this.getStructureForTwig = this.getStructureForTwig.bind(this);
  }

  parse(){
    this.parsedNodes = [];
    // Parse out any preamble nodes, and set the
    // body to be everything _after_ the preamble
    let body = this.parseDocumentPreamble();

    // Stash the epilogue text for later, and set the body
    // to everything before it.
    const split = body.split(/\$\$/);
    body = split[0];
    const epilogueText = split[1];

    // Parse each of the sections.
    const sections = this.constructor.splitIntoTopicSections(body);
    sections.forEach(this.parseSection);

    // Now parse the epilogue text
    this.parseEpilogueContent(epilogueText);
  }

  /**
   * Parse out the preamble nodes,
   * and return a new string with the
   * corresponding section removed
   */
  parseDocumentPreamble(){
    const lines = this.source.split("\n");
    const preambleLines = [];
    let currentLine = 0;
    while(!lines[currentLine].match(/^\.[A-Za-z]/)){
      preambleLines.push(lines[currentLine]);
      currentLine += 1;
    }

    // Keep track of the string _after_ the preamble,
    // in order to return it to the caller
    const remaining = lines.slice(currentLine).join("\n");

    // Parse and push the preamble nodes based on the content
    const preambleParagraphs = preambleLines.join("\n").split("\n\n");
    for(let i = 0; i < preambleParagraphs.length; i++){
      let nodeType = "preambleText";
      if(i === 0){
        nodeType = "preambleCode";
      }
      const paragraph = preambleParagraphs[i];

      const text = this.constructor.normalizeSpaces(paragraph).trim();
      if(text !== ""){
        this.parsedNodes.push({
          type: nodeType,
          content: text
        });
      }
    }

    return remaining;
  }

  /**
   * Parse an AFD topic section.
   * The directive defines the topic sections as starting
   * with any of the valid headers (see header functions)
   * followed by any body text _up until_ double-ampersand.
   * We parse headers and body text for a single section below
   * using mapped functions for each section type as needed
   */
  parseSection(str){
    // Every new section is assumed to be a generic
    // type, until a special header dictates otherwise
    this.contentType = "generic";

    // Split into paragraphs, which are defined as
    // double newlines
    // If there is not a valid header in the first paragraph,
    // we consider it "empty"
    const paragraphs = str.trim().split("\n\n");
    paragraphs.forEach(paragraph => {
      let rest = this.parseHeader(paragraph);
      rest = this.parseSubheader(rest);
      this.parseTextContent(rest);
    });
  }

  parseHeader(str){
    // First, we see if we match on any of the more specialized
    // headers. If so, we append the corresponding node and update
    // the content type for the parser
    const specialTypeNames = Object.keys(SPECIAL_HEADER_TYPES);
    for(let i = 0; i < specialTypeNames.length; i++){
      const specialTypeName = specialTypeNames[i];
      const specialHeader = SPECIAL_HEADER_TYPES[specialTypeName];
      const match = str.match(specialHeader.re);
      if(match){
        let content = match.groups.header;
        if(specialTypeName === "wwa"){
          content = match.groups.header.replaceAll("/", "&hairsp;/&hairsp;");
        }
        this.contentType = specialTypeName;
        this.parsedNodes.push({
          type: "header",
          content
        });
        return str.slice(
          match.index + match[0].length
        );
      }
    }

    // If we get here, no specialized headers were found for this
    // paragraph. Attempt to parse a generic header
    const genericMatch = str.match(GENERIC_HEADER_REGEX);
    if(genericMatch){
      this.contentType = "generic";
      this.parsedNodes.push({
        type: "header",
        content: genericMatch.groups.header
      });
      return str.slice(
        genericMatch.index + genericMatch[0].length
      );
    }

    return str;
  }

  parseSubheader(str){
    const match = str.trim().match(SUBHEADER_REGEX);
    if(match){
      this.parsedNodes.push({
        type: "subheader",
        content: match.groups.subheader
      });
      
      return match.input.slice(
        match.index + match[0].length
      ).trim();
    }

    return str;
  }

  parseTextContent(str){
    if(str === ""){
      return str;
    }
    switch(this.contentType){
    case "wwa":
      return this.parseWWAContent(str);
    case "tempsTable":
      return this.parseTempsTableContent(str);
    default:
      return this.parsedNodes.push({
        type: "text",
        content: this.constructor.normalizeSpaces(
          str.trim().replaceAll("\n", " "))
      });
    }
    
  }

  parseWWAContent(str){
    // A newline followed by 4 spaces indentation
    // indicates line continuation. Replate with the
    // empty string, followed by a normal newline
    let currentString = str.trim();
    currentString = currentString.replace(/\n\s+/g, "\n");
    if(currentString !== ""){
      this.parsedNodes.push({
        type: "text",
        content: currentString
      });
    }
  }

  parseTempsTableContent(str){
    // There could be whitespace between the TEMPS/POPS header
    // and the actual data, so clean that up first. There
    // *shouldn't* be, but we've seen it happen,
    // so guard against it
    const lines = str.trim().split("\n");

    // We want to only consider lines that are part of table
    // rows. Anything else subsequently (if there is anything else)
    // should be considered text content.
    const tableRowRx = /[^\d]+(\d+\s+)+\/\s+(\d+\s+)+\d+\s*(\n|$)/g;
    const tableLines = lines.filter(line => line.match(tableRowRx));

    const restOfLines = lines.filter(line => !line.match(tableRowRx));

    // Parse out the row labels and the numbers from
    // any table rows
    const rx = /^([^\d]|\s)*/g;
    const rows = [];
    for(let i = 0; i < tableLines.length; i++){
      const line = tableLines[i];
      let numbers = line.split(rx).filter(item => (item !== "" || !item.match(/\s+/))).pop();

      numbers = numbers.trim().split(" ")
        .map(digitString => digitString.trim())
        .filter(digitString => digitString.match(/\d+/));

      const placeRx = /^(?<place>[^\d]+)/;
      let place = null;
      const placeMatch = line.match(placeRx);
      if(placeMatch){
        place = placeMatch.groups.place.trim();
      }

      rows.push({
        type: "temps-table-row",
        numbers,
        name: place
      });
    }

    if(rows.length){
      this.parsedNodes.push({
        type: "temps-table",
        rows
      });
    }

    // Finally, parse out any remaining text as
    // text node(s)
    const remainingText = restOfLines.join("\n").trim();
    if(remainingText !== ""){
      this.parsedNodes.push({
        type: "text",
        content: remainingText
      });
    }
  }

  parseEpilogueContent(str){
    const lines = str.trim().split("\n").map(line => line.trim());
    const currentString = lines.join("\n");
    if(currentString !== ""){
      this.parsedNodes.push({
        type: "epilogueText",
        content: currentString
      });
    }
  }

  getStructureForTwig(){
    const preambleCode = [];
    const preambleText = [];
    const body = [];
    const epilogue = [];
    this.parsedNodes.forEach(node => {
      if(node.type === "preambleCode"){
        preambleCode.push(node);
      } else if(node.type === "preambleText"){
        preambleText.push(node);
      } else if(node.type.startsWith("epilogue")){
        epilogue.push(node);
      } else {
        body.push(node);
      }
    });

    return {
      preamble: {
        code: preambleCode,
        text: preambleText
      },
      body,
      epilogue
    };
  }
  
  /**
   * Change all instances of multiple contiguous spaces
   * into a single space
   */
  static normalizeSpaces(str){
    return str.replace(/( +)|( $)/g, " ");
  }

  /**
   * Divide the given AFD string into "topic sections".
   * These are defined by the directive as beginning with a
   * header (see format above) and ending with "&&\n".
   * Note that we are a bit more forgiving here -- we will
   * simply split by the double-ampersand and assume these
   * are the topic sections, since WFOs sometimes forget headers
   */
  static splitIntoTopicSections(str){
    const splits = str.trimStart().split("&&\n");
    return splits.filter(section => !section.match(/^\s*$/));
  }
}
