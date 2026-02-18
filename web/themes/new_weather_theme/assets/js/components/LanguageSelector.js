/**
 * Language Selector + Units Toggle Component
 * -------------------------------------------
 * Enhances the server-rendered language dropdown and units
 * toggle that live inside the site header.
 *
 * Language switching:
 *   Drupal negotiates language via URL path prefixes
 *   (/es/, /zh-hans/). This component reads the current
 *   pathname, figures out which language is active, and
 *   rewrites the <a> hrefs so each link points to the
 *   correct translated version of the current page.
 *
 * Units toggle:
 *   Stores the user's preferred unit system ("us" or "metric")
 *   in localStorage. On init the saved preference is restored;
 *   on toggle a custom event ("wx:units-changed") fires so
 *   other components can react without polling.
 */

// Known language path prefixes, keyed by Drupal langcode.
// English has no prefix (empty string), the other two carry
// their standard Drupal path prefix values.
const LANG_PREFIXES = {
  en: "",
  es: "/es",
  "zh-hans": "/zh-hans",
};

// Ordered array for iteration — makes it easy to check each
// prefix against the current path
const LANG_CODES = Object.keys(LANG_PREFIXES);

// localStorage key and the only two values we'll accept
const UNITS_STORAGE_KEY = "wxgov_units";
const ALLOWED_UNITS = ["us", "metric"];

class LanguageSelector extends HTMLElement {
  connectedCallback() {
    this.setupLanguageLinks();
    this.setupUnitsToggle();
  }

  /**
   * Derives the active language from the current URL and
   * updates every language link so it points to the equivalent
   * page in the target language. Also visually marks the
   * current language as active.
   */
  setupLanguageLinks() {
    const currentLang = this.detectCurrentLanguage();
    const basePath = this.stripLanguagePrefix(window.location.pathname, currentLang);

    // Walk through each language link and compute its target URL
    const langLinks = this.querySelectorAll("a[data-lang]");
    langLinks.forEach((link) => {
      const targetLang = link.getAttribute("data-lang");
      const prefix = LANG_PREFIXES[targetLang] || "";

      // Rebuild the full URL with the target language prefix,
      // preserving any query string or hash fragment
      const targetPath = prefix + (basePath || "/");
      link.setAttribute(
        "href",
        targetPath + window.location.search + window.location.hash,
      );

      // Highlight the link for the language we're already viewing.
      // The aria-current goes on the link itself for assistive tech,
      // but the active class goes on the parent <li> so the CSS
      // descendant selector (.usa-language__submenu-item--active a)
      // can style the link correctly.
      if (targetLang === currentLang) {
        link.setAttribute("aria-current", "true");
        if (link.parentElement) {
          link.parentElement.classList.add("usa-language__submenu-item--active");
        }
      }
    });
  }

  /**
   * Checks the pathname against known language prefixes.
   * Falls back to English when nothing matches.
   */
  detectCurrentLanguage() {
    const path = window.location.pathname;

    // Try non-English prefixes first (they have actual path segments)
    for (const lang of LANG_CODES) {
      const prefix = LANG_PREFIXES[lang];
      if (prefix && (path.startsWith(`${prefix}/`) || path === prefix)) {
        return lang;
      }
    }

    // No prefix found — must be English
    return "en";
  }

  /**
   * Strips the language prefix from a pathname so we get the
   * language-neutral base path. For example:
   *   /es/point/37/-122  →  /point/37/-122
   *   /point/37/-122     →  /point/37/-122
   */
  stripLanguagePrefix(pathname, lang) {
    const prefix = LANG_PREFIXES[lang];
    if (prefix && pathname.startsWith(prefix)) {
      return pathname.substring(prefix.length) || "/";
    }
    return pathname;
  }

  /**
   * Reads the saved unit preference from localStorage (with
   * allowlist validation), applies it to the toggle buttons,
   * and attaches click handlers for switching.
   */
  setupUnitsToggle() {
    // Retrieve the stored preference, falling back to US if
    // nothing is saved or the value is unexpected.
    // localStorage can throw in private browsing or restricted
    // environments, so we wrap access in try/catch.
    let initialUnits = "us";
    try {
      const stored = localStorage.getItem(UNITS_STORAGE_KEY);
      if (ALLOWED_UNITS.includes(stored)) {
        initialUnits = stored;
      }
    } catch {
      // Storage unavailable — stick with the default
    }

    // Apply the initial state to the buttons
    this.applyUnitsState(initialUnits);

    // Listen for clicks on either toggle button
    const buttons = this.querySelectorAll(".wx-units-toggle__btn");
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const units = btn.getAttribute("data-units");

        // Guard: never store a value outside our allowlist
        if (!ALLOWED_UNITS.includes(units)) return;

        // Persist the choice when storage is available
        try {
          localStorage.setItem(UNITS_STORAGE_KEY, units);
        } catch {
          // Storage unavailable — toggling still works for the
          // current session, just won't persist across reloads
        }

        this.applyUnitsState(units);

        // Let the rest of the page know about the change
        this.dispatchEvent(
          new CustomEvent("wx:units-changed", {
            detail: { units },
            bubbles: true,
          }),
        );
      });
    });
  }

  /**
   * Syncs the toggle buttons' visual state and aria-pressed
   * attributes to reflect the given unit system.
   */
  applyUnitsState(activeUnits) {
    const buttons = this.querySelectorAll(".wx-units-toggle__btn");
    buttons.forEach((btn) => {
      const isActive = btn.getAttribute("data-units") === activeUnits;
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");

      // Swap USWDS button styles to distinguish active vs inactive
      if (isActive) {
        btn.classList.remove("usa-button--outline");
      } else {
        btn.classList.add("usa-button--outline");
      }
    });
  }
}

window.customElements.define("wx-language-selector", LanguageSelector);
