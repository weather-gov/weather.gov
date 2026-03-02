import Timer from "./timer.js";

const debouncer = new Timer();
/**
 * Cache the text here to compare text between calls.
 * 
 * This is needed because some screenreaders will not announce "repeat" messages.
 */
let text = "";

/**
 * Adds a span of screenreader only text to
 * a page-wide aria-live region,
 * which is itself also hidden.
 * The update is on a 1 second delay, which is preferred
 * based on convos with USWDS.
 *
 * To use:
 *   const text = gettext("js.<keyFromDjangojs.po>.01"));
 *   window.dispatchEvent(new CustomEvent("wx-announce", { detail: { text }}));
 */
const updateAriaLive = (e) => {
  const delay = Number.isFinite(e.detail?.delay) ? e.detail?.delay : 1000;
  // check if this is a repeat message
  if (text === e.detail?.text) {
    // if so, append a non-breaking space
    text += "\u00A0";
  } else {
    // otherwise, use the new text
    text = e.detail?.text;
  }
  debouncer.start(() => {
    const span = document.createElement("span");
    span.innerText = text;
    const liveRegion = document.querySelector("#sr-only");
    liveRegion.innerHTML = "";
    liveRegion.append(span);
  }, delay);
};

window.addEventListener("wx-announce", updateAriaLive);
