/**
 * GHWO County Selector
 * ----------------------------------
 * A minimal custom element that wraps two
 * <wx-combobox> elements, one each for
 * selecting a state and a county within that state
 *
 * A change event dispatched by either combobox
 * will trigger an update.
 *
 * Updates come in two varieties:
 * - An HTML-only endpoint that will return
 *   a copy of this component's outerHTML
 *   with updated information (HTMX style)
 * - A form submission
 *
 * The component chooses which method to use based
 * on the `method=` attribute of this element. If the
 * method is present and set to "async", it will only
 * fetch the innerHTML required to rerender the form
 * in place. Otherwise, it will send a form submission.
 *
 * See templates/weather/partials/wx-county-ghwo-selector.html
 * for details on the structural assumptions
 */

const WX_COUNTY_GHWO_SELECTOR_URL = `/wx/select/ghwo/counties/`;
const WX_COUNTY_GHWO_DETAILS_URL = `/wx/ghwo/counties/`;
const WX_STATE_GHWO_DETAILS_URL = `/wx/ghwo/state/`;
const STATE_GHWO_URL = `/forecast/state/<stateCode>/risk-overview/`;
const COUNTY_GHWO_URL = `/forecast/county/<countyFips>/risk-overview/`;

// Specifies a timeout/delay in milliseconds before the loader
// image should show during asynchronous requests for
// ghwo details data. If a request returns _before_ this
// timeout has expired, the timeout will be cancelled.
// See the showLoader() and hideLoader() component
// methods.
// 400 was picked because it "feels" like a good delay,
// in testing conditions. Feel free to modify as needed.
export const WX_GHWO_DETAILS_LOADER_TIMEOUT = 400;

class GHWOCountySelector extends HTMLElement {
  constructor() {
    super();

    // Bound methods
    this.handleChange = this.handleChange.bind(this);
    this.fetchUpdatedSelectComponent =
      this.fetchUpdatedSelectComponent.bind(this);
    this.fetchAndUpdateDetailsElements =
      this.fetchAndUpdateDetailsElements.bind(this);
    this.handleNavButton = this.handleNavButton.bind(this);
    this.updateBrowserHistory = this.updateBrowserHistory.bind(this);
    this.showLoader = this.showLoader.bind(this);
    this.hideLoader = this.hideLoader.bind(this);
    this.updateViewCountyDetailsLink =
      this.updateViewCountyDetailsLink.bind(this);
  }

  connectedCallback() {
    this.addEventListener("change", this.handleChange);
    window.addEventListener("popstate", this.handleNavButton);
    this.updateBrowserHistory(window.location.href, true);
  }

  disconnectedCallback() {
    this.removeEventListener("change", this.handleChange);

    // There might be one or more timeouts whose
    // components have been removed from the DOM
    // but are still lurking. Make sure we get rid of those.
    this.hideLoader();
  }

  async handleChange(event) {
    const combobox = event.target.closest("wx-combobox");
    const changed = combobox.getAttribute("id");
    const value = combobox.querySelector("input[type='hidden']").value;

    // handle the case when state is cleared.
    if (!value) {
      return;
    }
    const countyOnly = changed === "county-selector";
    if (countyOnly) {
      // In this case, the existing county dropdown was the
      // source of the change. We do not need to update the
      // comboboxes, but we do need to update any elements
      // needing GHWO detail information.
      this.countyCombobox.setAttribute("disabled", true);
      await this.fetchAndUpdateDetailsElements();
      this.countyCombobox.removeAttribute("disabled");
    } else {
      // In this case, the state combobox triggered the change.
      // We need to dynamically update both comboboxes
      // (ie this components innerHTML), as well as any elements
      // needing GHWO detail information.
      // We won't know which county to fetch detail information
      // for until the first request comes back.
      this.stateCombobox.setAttribute("disabled", true);
      this.countyCombobox.setAttribute("disabled", true);
      const response = await this.fetchUpdatedSelectComponent();
      if (response.ok) {
        await this.fetchAndUpdateDetailsElements();
      }
      this.countyCombobox.removeAttribute("disabled");
      this.stateCombobox.removeAttribute("disabled");
    }
  }

  /**
   * Fetches new markup for the component's
   * outerHTML and replaces this component.
   * Will also update the URL and history as
   * needed.
   */
  async fetchUpdatedSelectComponent() {
    const formData = new FormData();
    ["current-county", "current-state"].forEach((name) => {
      formData.append(name, this.querySelector(`[name="${name}"]`).value);
    });
    ["state", "county"].forEach((name) => {
      formData.append(name, this.querySelector(`[name="${name}"]`).value);
    });
    const response = await fetch(WX_COUNTY_GHWO_SELECTOR_URL, {
      method: "POST",
      body: formData,
    });

    // In case of 404, it is still better to show something than to
    // silently fail and leave the user wondering why the site is "unresponsive"

    if (response.ok || response.status === 404) {
      const html = await response.text();
      // Swap out the inner HTML of this component
      this.innerHTML = html;
    } else {
      // For now simply log the error
      console.error(
        `Could not POST to ${WX_COUNTY_GHWO_SELECTOR_URL} with FormData ${formData}`,
      );
    }

    return response;
  }

  /**
   * Fetch GHWO data for the current selection and
   * update any elements that are subscribed to GHWO
   * data updates via the wx-ghwo-details attribute.
   *
   * The corresponding elements will have their innerHTML
   * swapped with the result
   */
  async fetchAndUpdateDetailsElements() {
    // See if there are any elements that actually need to be
    // updated dynamically with the GHWO details.
    // If not, early return
    const elements = Array.from(document.querySelectorAll(`[wx-ghwo-details]`));
    if (elements.length === 0) {
      return;
    }

    // Fetch the GHWO details partial for the currently selected county fips
    const selectedCountyFips = this.querySelector(`[name="county"]`).value;
    const selectedStateCode = this.querySelector(`[name="state"]`).value;
    const showAllCountiesForState = selectedCountyFips === "all";

    this.showLoader(elements);
    const url = showAllCountiesForState
      ? `${WX_STATE_GHWO_DETAILS_URL}${selectedStateCode}`
      : `${WX_COUNTY_GHWO_DETAILS_URL}${selectedCountyFips}`;
    const response = await fetch(url);
    this.hideLoader();

    if (response.ok) {
      const html = await response.text();
      elements.forEach((element) => {
        element.innerHTML = html;
      });

      // Update the browser history and url
      if (showAllCountiesForState) {
        this.updateViewCountyDetailsLink();
        this.updateBrowserHistory(
          STATE_GHWO_URL.replace("<stateCode>", selectedStateCode),
        );
      } else {
        this.updateViewCountyDetailsLink(selectedCountyFips);
        this.updateBrowserHistory(
          COUNTY_GHWO_URL.replace("<countyFips>", selectedCountyFips),
        );
      }
    } else {
      const errorEl = document.createElement("pre");
      errorEl.innerHTML = `Could not retrieve GHWO details for county: ${selectedCountyFips}`;
      elements.forEach((element) => {
        element.innerHTML = errorEl.outerHTML;
      });
      console.error(
        `Could not retrieve GHWO details for county ${selectedCountyFips}`,
      );
    }
  }

  /**
   * In some cases, we want to hide/show the selector
   * form's link to county details.
   * In cases where we are showing information for all counties
   * for a given state, we want to hide the link. In cases where
   * we are showing a specific county, we want to show the link.
   * When showing the county link, we also want to ensure that padding
   * and border styles are applied dynamically to both county + state links.
   */
  updateViewCountyDetailsLink(countyfips = false) {
    const countyDetailsContainer = document.getElementById(
      "view-county-details-container",
    );
    const countyDetailsAnchor = document.getElementById(
      "view-county-details-link",
    );
    const stateDetailsContainer = document.getElementById(
      "view-state-details-container",
    );
    if (!countyDetailsAnchor) {
      return;
    }
    let href = countyDetailsAnchor.href;
    if (countyfips) {
      href = countyDetailsAnchor.href.replace(
        /\/(all|[0-9]{5})/,
        `/${countyfips}`,
      );
      countyDetailsAnchor.setAttribute("href", href);
      countyDetailsAnchor.removeAttribute("aria-hidden");
      if (countyDetailsContainer) {
        countyDetailsContainer.classList.remove("display-none");
      }
      if (stateDetailsContainer) {
        stateDetailsContainer.classList.add("padding-left-2");
      }
    } else {
      countyDetailsAnchor.setAttribute("href", href.replace(/[0-9]{5}/, "all"));
      countyDetailsAnchor.setAttribute("aria-hidden", true);
      if (countyDetailsContainer) {
        countyDetailsContainer.classList.add("display-none");
      }
      if (stateDetailsContainer) {
        stateDetailsContainer.classList.remove("padding-left-2");
      }
    }
  }

  /**
   * When we pushState to the browser history
   * (as we do when fetching partials), we need to
   * ensure that the back and forward buttons do a full page
   * refresh. Otherwise only the URL will change.
   */
  handleNavButton(event) {
    if (event.state?.on_ghwo_page === true) {
      window.location.reload();
    }
  }

  /**
   * Show the loader graphic in the details area(s).
   * Instead of displaying right away, set a timeout
   * that can be cleared if the request returns fast enough.
   */
  showLoader(elements) {
    this.loading = true;
    this.loaderTimeout = setTimeout(() => {
      if (this.loading === false) return;
      const template = document.getElementById("ghwo-wx-loader");
      if (template) {
        elements.forEach((el) => {
          el.innerHTML = "";
          el.append(template.content.cloneNode(true));
        });
      }
    }, WX_GHWO_DETAILS_LOADER_TIMEOUT);
  }

  /**
   * Remove the timeout that showLoader has set
   * on this element.
   * We don't actually hide the loader, because data loaded
   * or an error will already change the innerHTML
   */
  hideLoader() {
    this.loading = false;
    if (this.loaderTimeout) {
      clearTimeout(this.loaderTimeout);
    }
  }

  /**
   * Helper function to keep the browser in sync with the selector.
   */
  updateBrowserHistory(url, replace = false) {
    if (replace) {
      window.history.replaceState({ on_ghwo_page: true }, "", url);
    } else {
      window.history.pushState({ on_ghwo_page: true }, "", url);
    }
  }

  get useAsync() {
    return this.getAttribute("method") === "async";
  }

  get countyCombobox() {
    return this.querySelector("input#county-select");
  }

  get countyHiddenValue() {
    return this.querySelector("input[name='county']");
  }

  get stateCombobox() {
    return this.querySelector("input#state-select");
  }

  get stateHiddenValue() {
    return this.querySelector("input[name='state']");
  }
}

if (!window.customElements.get("wx-ghwo-selector")) {
  window.customElements.define("wx-ghwo-selector", GHWOCountySelector);
}
export default GHWOCountySelector;
