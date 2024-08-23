export * from "./case.js";
export * from "./convert.js";
export { default as dayjs } from "./day.js";
export { default as openDatabase } from "./db.js";
export { default as fetchAPIJson } from "./fetch.js";
export * from "./icon.js";
export { default as sleep } from "./sleep.js";

export const paragraphSquash = (str) =>
  str?.replace(/([^\n])\n([^\n])/gm, "$1 $2");
