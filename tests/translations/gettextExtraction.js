const fs = require("fs");
const path = require("path");
const { globSync } = require("glob");

const MSG_ID_RX = /msgid\s+\"(.+)\"/m;
const MSG_STR_RX = /msgstr\s+\"(.*)\"/m;

/**
 * Parse out the individual blocks of
 * relevant gettext entries from some
 * source string.
 * Here a 'block' is any series of contiguous
 * lines of text that are not just an empty string/newline.
 */
const parseGettextBlocks = (str) => 
  // We ignore the first block, which is just
  // the gettext header information
   str.split("\n\n").slice(1)
;

const parseGettextSource = (str) => {
  const results = [];
  const blocks = parseGettextBlocks(str);

  blocks.forEach((block) => {
    const comments = block.split("\n").filter((line) => line.startsWith("#"));
    let msgidString;
      let msgstrString;
      let msgid;
      let msgstr = null;

    const msgidMatch = block.match(MSG_ID_RX);
    if (msgidMatch) {
      msgidString = msgidMatch[0];
      msgid = msgidMatch[1].replace(/\\n/g, "\n");
    }

    const msgstrMatch = block.match(MSG_STR_RX);
    if (msgstrMatch) {
      msgstrString = msgstrMatch[0];
      msgstr = msgstrMatch[1];
    }

    if (!msgstrMatch || !msgidMatch) {
      throw new Error(
        `Parse Error: Missing id or str pattern in block: ${block}`,
      );
    }

    results.push({
      comments,
      msgid,
      msgstr,
      msgidString,
      msgstrString,
    });
  });

  return results;
};

/**
 * For a given list of translation file paths,
 * respond with a dictionary mapping filenames
 * to match information for the gettext values
 *
 * @type (sourcePaths: string) => Object<string, Object<string, {comments: string, msgid: string, msgstr: string, msgidString: string, msgstrString: string}>>
 */
const getTranslationMatchInfo = (sourcePaths) => {
  const lookup = {};

  sourcePaths.forEach((filePath) => {
    const languageCode = path.basename(filePath).split(".")[0];
    const langLookup = {};
    const source = fs.readFileSync(filePath).toString();
    const parsed = parseGettextSource(source);
    parsed.forEach((entry) => (langLookup[entry.msgid] = entry));
    lookup[languageCode] = langLookup;
  });

  return lookup;
};

module.exports = {
  getTranslationMatchInfo,
};
