const SPECIAL_HEADER_TYPES = {
  wwa: {
    re: /^\.(?<header>[A-Z]{3}\sWATCHES\/WARNINGS\/ADVISORIES)[\.]{3}/,
  },
  tempsTable: {
    re: /^\.(?<header>.*TEMPS\/POPS)[.]{3}/,
  }
};

const GENERIC_HEADER_REGEX = /^\.(?<header>.+)[\.]{3}/;
const SUBHEADER_REGEX = /^\s*\.{3}(?<subheader>[^\.]+)\.{3}/;


export default class AFDParser {
  constructor(str){
    this.source = str;
    this.parsedNodes = [];
    this.currentContentType = "generic";
  }

  parse(){
    this.parsedNodes = [];
    // Parse out any preamble nodes, and set the
    // body to be everything _after_ the preamble
    let body = this.parseDocumentPreamble();

    // Stash the epilogue text for later, and set the body
    // to everything before it.
    const split = body.split("$$");
    const epilogueText = split[1];
    body = split[0];

    // Parse each of the sections.
    const sections = this.constructor.splitIntoTopicSections(body);
    sections.forEach(this.parseSection);
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

      let text = this.constructor.normalizeSpaces(paragraph).trim();
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
    // Split into paragraphs, which are defined as
    // double newlines
    // If there is not a valid header in the first paragraph,
    // we consider it "empty"
    const nodes = [];
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
        this.updateContentType(specialTypeName);
        this.parsedNodes.push({
          type: "header",
          content: match.groups.header
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
      this.updateContentType("generic");
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
      return str.slice(
        match.index + match[0].length
      );
    }

    return str;
  }

  parseTextContent(str){
    if(str === ""){
      return;
    }
    switch(this.contentType){
    case "wwa":
      this.parseWWAContent(str);
      break;
    case "tempsTable":
      this.parseTempsTableContent(str);
      break;
    default:
      this.parsedNodes.push({
        type: "text",
        content: str.trim()
      });
    }
  }

  parseWWAContent(str){
    // A newline followed by 4 spaces indentation
    // indicates line continuation. Replate with the
    // empty string, followed by a normal newline
    let currentString = str.trim();
    currentString = currentString.replace(/\n\s+/g, "");
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
    const rx = /^[^\d]*(.+)/;
    const rows = [];
    for(let i = 0; i < lines.length; i++){
      const line = lines[i];
      let numbers = line.split(rx);
      numbers = numbers.filter(val => {
        return val !== "";
      });

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
  }
  
  // TODO: Remove this indirection if we can
  updateContentType(str){
    this.contentType = str;
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
    return splits.filter(section => {
      return !section.match(/^\s*$/);
    });
  }
}
