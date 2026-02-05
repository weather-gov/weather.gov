export const sentenceCase = (str?: string) =>
  str?.replace(/ [A-Z]/g, (letter) => letter.toLowerCase());

export const titleCase = (str?: string) =>
  str?.replace(
    /\w\S*/g,
    (text) => text.charAt(0).toUpperCase() + text.slice(1).toLowerCase(),
  );

export default { sentenceCase, titleCase };
