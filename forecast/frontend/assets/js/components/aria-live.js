import Timer from "./timer.js";

const debouncer = new Timer();

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
  const text = e.detail?.text;
  debouncer.start(() => {
    const span = document.createElement("span");
    span.innerText = text;
    const liveRegion = document.querySelector("#sr-only");
    liveRegion.innerHTML = "";
    liveRegion.append(span);
  }, 1000);
};

window.addEventListener("wx-announce", updateAriaLive);
