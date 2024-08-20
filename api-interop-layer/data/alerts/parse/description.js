import paragraphSquash from "../../../util/paragraphSquash.js";

const extractUrls = (str) => {
  const regex = /https:\/\/[A-Za-z0-9\-._~:?#[\]@!$]+(\/[\S]+|$)\b/gi;

  const match = str.match(regex);

  // If there are any URL matches...
  if (match) {
    // Only keep URLs that are .gov and do not have username or password
    // components.
    const urls = match
      .map((s) => new URL(s))
      .filter((url) => {
        if (url.username || url.password || !url.hostname.endsWith(".gov")) {
          return false;
        }
        return true;
      });

    // If there aren't any such valid URLs, we're done.
    if (urls.length === 0) {
      return false;
    }

    return urls.map((url) => {
      const internal = /\.?weather\.gov$/.test(url.hostname);
      return {
        type: "link",
        url: url.href,
        external: !internal,
      };
    });
  }
  return false;
};

const getParagraphNodesForString = (str) => {
  const links = extractUrls(str);
  if (!links) {
    return [{ type: "text", content: str }];
  }

  const nodes = [];
  let current = str;
  for (const link of links) {
    const position = current.indexOf(link.url);
    const text = current.slice(0, position);

    nodes.push({ type: "text", content: text }, link);

    current = current.slice(position + link.url.length);
  }

  if (current && current.length > 0) {
    nodes.push({ type: "text", content: current });
  }

  return nodes;
};

export const parseDescription = (description) => {
  if (!description) {
    return [{ type: "paragraph", nodes: [] }];
  }

  const blocks = paragraphSquash(description);

  const nodes = blocks
    .split(/\r\n|\r|\n/m)
    .filter((text) => text.length)
    .flatMap((paragraph) => {
      const paragraphNodes = [];

      const overview = paragraph.match(/^\.\.\.([^.]+)\.\.\.$/);
      if (overview) {
        paragraphNodes.push({
          type: "paragraph",
          nodes: getParagraphNodesForString(overview[1]),
        });
      }

      const headings = paragraph.match(/^\*\s+([A-Z\s]+)\.\.\.(.*)$/);
      if (headings) {
        paragraphNodes.push(
          {
            type: "heading",
            text: headings[1].toLowerCase(),
          },
          { type: "paragraph", nodes: getParagraphNodesForString(headings[2]) },
        );
      }

      if (paragraphNodes.length === 0) {
        paragraphNodes.push({
          type: "paragraph",
          nodes: getParagraphNodesForString(paragraph),
        });
      }

      return paragraphNodes;
    });

  return nodes;
};

export default { parseDescription };
