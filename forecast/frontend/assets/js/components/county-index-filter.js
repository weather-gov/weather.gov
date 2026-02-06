/**
 * County Index Filter component
 * ------------------------------------------------
 * This component handles the events from a combobox and
 * input field, which handle filtering the county list by state and
 * a fuzzy-match county name string respectively.
 * The component works by making an in-memory template element
 * with the initial result area markup as the innerHTML.
 * When filtering, it is this in-memory version that is cloned and
 * modified, then set as the innerHTML on the result area
 * once the in-memory filtering is completed.
 * The `id` of the containing result area must be set as the
 * `target` attribute on this custom element, in order for
 * proper filtering to function.
 */

class CountyIndexFilter extends HTMLElement {
  constructor() {
    super();

    // Bound methods
    this.handleInput = this.handleInput.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.filter = this.filter.bind(this);
  }

  connectedCallback() {
    // We stash a copy of the given resultArea DOM
    // internally. This will be used for swapping out
    // filtered trees of results more efficiently.
    this.filterSource = document.createElement("template");
    if (this.resultArea) {
      this.filterSource.innerHTML = this.resultArea.outerHTML;
    } else {
      console.error(
        `No valid result area target found. Did you set a 'target=' attribute?`,
      );
    }

    // If we can find the initial combobox, clear it so that it has no
    // current value or display
    const combobox = document.getElementById("state-filter-combobox");
    const listbox = combobox.querySelector("wx-filterable-listbox");
    const clearButton = combobox.querySelector(`[slot="clear-button"]`);

    clearButton.addEventListener("click", () => {
      this.handleChange({ target: { selection: false } });
    });

    // Clear listbox filters
    listbox.clearFilter();
    // And clear any text inputs
    combobox.handleInput();

    // Now add the event listeners. We do this here so that the initial
    // `clear()` on the combobox does not result in a change event
    // we capture. We only want to know about change events
    // _after_ that point in time.
    this.addEventListener("input", this.handleInput);
    listbox.addEventListener("change", this.handleChange);
  }

  /**
   * Handle any input events that bubble up to this
   * component.
   * We check to make sure that the target id matches
   * the id of the filtering input field, which should be
   * `#county-filter-input`
   * If matched, we set the current text value or null,
   * then call the filter method.
   */
  handleInput(event) {
    if (event.target.id === "county-filter-input") {
      this.currentInput = event.target.value ? event.target.value : null;
      this.filter();
    }
  }

  /**
   * Handle changes on the listbox component.
   * If matched, we set this components "selected-state"
   * attribute to the state abbreviation, if a value is in
   * the listboc, or remove the attribute if not.
   * We then call the filter method.
   */
  handleChange(event) {
    if (event.target.selection) {
      this.setAttribute("selected-state", event.target.selection.id);
    } else {
      this.removeAttribute("selected-state");
    }

    this.filter();
  }

  /**
   * Create a copy of the initial saved DOM where the
   * following elements are removed:
   * (1) Any county link that does not match the input fuzzy string,
   * if there is an input present;
   * (2) All states that are not the one selected in the combobox,
   * if there is a state selected;
   * (3) All states that have no county results, because they all
   * will be removed by the input fizzy search.
   * The updated copy is then set to the innerHTML of the targeted
   * result area in the live DOM.
   * Note: We wrap the actual processing in a requestAnimationFrame
   * and timeout, so that on slower CPU devices a user can continue to
   * interact with the application even while the results update.
   */
  filter() {
    const selectedState = this.getAttribute("selected-state");
    const source = this.filterSource.content.cloneNode(true).children[0];

    // Yield the re-processing of the templated elements
    // (and their insertion into the dom) to the main thread
    requestAnimationFrame(() => {
      setTimeout(() => {
        // If there is a selected state, then the rest of the filter operation
        // will proceed only on that state, after all the others have been hidden.
        // Otherwise, we proceed with the normal filtering on the full
        // list of state elements.
        if (selectedState) {
          source
            .querySelectorAll(
              `[data-filter-by="state"]:not([data-state-abbrev="${selectedState}"])`,
            )
            .forEach((notSelectedStateEl) => {
              notSelectedStateEl.remove();
            });
        }

        // Iterate through each remaining state element.
        // If none of its counties match the filter, remove them.
        if (this.currentInput) {
          Array.from(
            source.querySelectorAll(`[data-filter-by="state"]`),
          ).forEach((stateElement) => {
            const numCounties = stateElement.querySelectorAll(
              `[data-filter-by="county"]`,
            ).length;
            const hiddenCounties = Array.from(
              stateElement.querySelectorAll(`[data-filter-by="county"]`),
            ).filter(
              (countyElement) =>
                !countyElement
                  .getAttribute("data-county-name")
                  .toLowerCase()
                  .includes(this.currentInput.toLowerCase()),
            );
            const numRemainingCounties = numCounties - hiddenCounties.length;
            if (!numRemainingCounties) {
              // There would be no counties left listed under this state if we removed
              // the ones that are filtered out. Instead of removing them one by one,
              // remove this whole state entirely, which won't be displayed if there
              // are no counties to be displayed inside of it.
              stateElement.remove();
            } else {
              // Otherwise, remove only the counties that have been filtered out.
              hiddenCounties.forEach((countyElement) => countyElement.remove());

              // If the number of counties is 8 or more, we add
              // the use-columns class to force the columnar layout
              if (numRemainingCounties >= 8) {
                stateElement.classList.add("use-columns");
              }
            }
          });
        }

        // Now set the resultArea's inner html to the active working template
        // inner html, swapping out the dom tree in one go.
        // This should result in only one relayout/repaint.
        this.resultArea.innerHTML = source.innerHTML;

        // Announce the result changes to screenreaders using
        // our global SR announce tooling
        const numCountiesDisplayed = this.resultArea.querySelectorAll(
          `[data-filter-by="county"]`,
        ).length;
        const numStatesDisplayed = this.resultArea.querySelectorAll(
          `[data-filter-by="state"]`,
        ).length;
        if (!window.ngettext || !window.interpolate || !window.gettext) {
          return;
        }

        const prefix = window.gettext("js.county-index.results.aria.01");
        const counties = window.interpolate(
          window.ngettext(
            "js.county-index.results.num-counties.01",
            numCountiesDisplayed,
          ),
          [numCountiesDisplayed],
        );
        const states = window.interpolate(
          window.ngettext(
            "js.county-index.results.num-states.01",
            numStatesDisplayed,
          ),
          [numStatesDisplayed],
        );

        window.dispatchEvent(
          new CustomEvent("wx-announce", {
            detail: {
              text: `${prefix}: ${counties}, ${states}`,
            },
          }),
        );
      }, 0);
    });
  }

  get resultArea() {
    return document.getElementById(this.getAttribute("target"));
  }
}

if (!window.customElements.get("wx-county-index-filter")) {
  window.customElements.define("wx-county-index-filter", CountyIndexFilter);
}
