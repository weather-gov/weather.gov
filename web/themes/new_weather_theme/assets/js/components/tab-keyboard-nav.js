/**
 * Shared WCAG tab keyboard navigation utility.
 *
 * Centralizes the arrow-key, Home, End, and optional activation
 * key handling mandated by the WCAG tabs pattern. Decoupled from
 * any specific custom element or DOM layout so each consumer can
 * supply its own container and tab selector.
 *
 * Three weather.gov components use this:
 *   - wx-tabs (generic WCAG tabs)
 *   - wx-tabbed-nav (location page navigator)
 *   - wx-daily-forecast (quick forecast day picker)
 *
 * Reference: https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
 */

/**
 * Shifts focus to the supplied element — or, when that element
 * isn't natively focusable (a wrapper <div> carrying a tab role,
 * for instance), drills into its first focusable descendant.
 */
const focusElement = (el) => {
  const focusable = "a, button, [tabindex]";
  if (el.matches(focusable)) {
    el.focus();
  } else {
    const child = el.querySelector(focusable);
    if (child) {
      child.focus();
    }
  }
};

/**
 * Wires up WCAG-compliant keyboard navigation on a group of
 * tab-like elements living inside a container.
 *
 * Navigation uses index-based lookup in the collected tab list
 * rather than DOM sibling traversal — this way, the tabs don't
 * need to be adjacent siblings in the markup.
 *
 * @param {HTMLElement} container - The element that will
 *   receive the keydown listener (usually the web component root)
 * @param {string} tabSelector - CSS selector matching the
 *   individual tab elements (e.g. '[role="tab"]', '.tab-button')
 * @param {Object} [options]
 * @param {boolean} [options.activateOnSpace=false]
 *   When true, pressing Space fires a click on the focused tab
 * @param {boolean} [options.activateOnEnter=false]
 *   When true, pressing Enter fires a click on the focused tab
 *
 * @returns {Function} A teardown callback that removes the
 *   keydown listener — intended for disconnectedCallback cleanup.
 */
export const attachTabKeyboardNav = (container, tabSelector, options = {}) => {
  const { activateOnSpace = false, activateOnEnter = false } = options;

  const handler = (event) => {
    // Identify the tab that currently holds focus (or contains
    // a focused descendant, via :focus-within)
    const focused = container.querySelector(
      `${tabSelector}:focus, ${tabSelector}:focus-within`,
    );
    if (!focused) return;

    // Gather every tab matching our selector and figure out
    // where the focused one sits in the sequence. Index-based
    // navigation is more reliable than previousElementSibling
    // when tabs aren't necessarily direct DOM siblings.
    const allTabs = Array.from(container.querySelectorAll(tabSelector));
    const currentIndex = allTabs.indexOf(focused);
    if (currentIndex < 0) return;

    let handled = false;

    if (event.key === "ArrowLeft") {
      // Step backward through the tab list, wrapping from
      // the first position back around to the last
      const prev = currentIndex === 0
        ? allTabs.length - 1
        : currentIndex - 1;
      focusElement(allTabs[prev]);
      handled = true;
    } else if (event.key === "ArrowRight") {
      // Advance forward, looping from the final tab back
      // to the beginning of the list
      const next = currentIndex === allTabs.length - 1
        ? 0
        : currentIndex + 1;
      focusElement(allTabs[next]);
      handled = true;
    } else if (event.key === "Home") {
      // Jump straight to the opening tab
      focusElement(allTabs[0]);
      handled = true;
    } else if (event.key === "End") {
      // Jump straight to the closing tab
      focusElement(allTabs[allTabs.length - 1]);
      handled = true;
    } else if (
      (activateOnSpace && (event.key === " " || event.key === "Space" || event.code === "Space")) ||
      (activateOnEnter && event.key === "Enter")
    ) {
      // Simulate a click so the tab's own activation logic runs
      focused.click();
      handled = true;
    }

    if (handled) {
      event.stopPropagation();
      event.preventDefault();
    }
  };

  container.addEventListener("keydown", handler);

  // Return a cleanup function for easy teardown
  return () => container.removeEventListener("keydown", handler);
};
