/**
 * Preload file to be run before all the components tests.
 * This ensures that the JSDOM instances don't compete
 * with each other
 */
import { JSDOM } from "jsdom";

// Create the DOM and capture the parts that we will use directly.
const { window } = new JSDOM("undefined", { url: "http://localhost/" });
const { document } = window;

// Create a version of requestAnimationFrame that immediately calls
// the passed in callback, as a kind of placeholder.
// This global function is not available in jsdom because it deals
// with browser paints etc.
window.requestAnimationFrame = (cb) => {
  cb();
};

// Set up the globals that the components need.
global.window = window;
global.document = document;
global.HTMLElement = window.HTMLElement;
global.Event = window.Event;
global.CustomEvent = window.CustomEvent;
global.FormData = window.FormData;
global.HTMLInputElement = window.HTMLInputElement;
global.requestAnimationFrame = window.requestAnimationFrame;
