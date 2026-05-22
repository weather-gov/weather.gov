/**
 * Preload file to be run before all the components tests.
 * This ensures that the JSDOM instances don't compete
 * with each other
 */
import { JSDOM } from "jsdom";
import { stub } from "sinon";

// Create the DOM and capture the parts that we will use directly.
const dom = new JSDOM("undefined", { url: "http://localhost/" });
global._jsDom = dom;
const { window } =  dom;
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
global.localStorage = window.localStorage;
global.sessionStorage = window.sessionStorage;

// Fetch is _super_ annoying to stub out individually across test
// files, because not cleaning up the mocks properly can cause
// state inconsistencies and errors across runs.
// Let's stub fetch globally in one place, and have all tests
// reset the stub whenever they can.
export const mochaHooks = {
  beforeEach(done){
    stub(global, "fetch");

    // JSDOM does not have the `scrollIntoView` method,
    // so we need to stub it out here on all elements.
    // The sub will be restored as a normal part of
    window.HTMLElement.prototype.scrollIntoView = stub();
    done();
  },

  afterEach(done){
    global.fetch.restore();
    done();
  },
};
