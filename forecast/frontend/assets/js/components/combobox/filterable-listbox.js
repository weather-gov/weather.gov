import Listbox from "./listbox.js";

export default class FilterableListbox extends Listbox {
  constructor(){
    super();
    this._cachedItems = null;

    // A selector specifying which options should be considered for filtering.
    // There are cases, such as in grouped options, where were would like
    // certain options to _never_ be filtered out. This gives us that affordance, via a
    // special data-filter-ignore attribute
    this.filterOptionsSelector = `*:not([data-filter-ignore="true"]) > [role="option"]:not([data-filter-ignore="true"])`;

    this.filterText = this.filterText.bind(this);
    this.clearFilter = this.clearFilter.bind(this);
    this.getFilterSource = this.getFilterSource.bind(this);
    this.handleItemsChanges = this.handleItemsChanged.bind(this);
  }

  /**
   * Filters the currently displayed options in the listbox
   * by the given string, selecting only those options whose
   * textContent is a fuzzy match for the incoming string.
   * This method relies on the existence of a "filter source" element
   * attached to the component, which can be used for both filtering
   * and restoring the original contents of the listbox whenever a filter
   * is cleared.
   * This method fires the custom event wx:popup-filter
   * @param String aString - The term to fuzzy filter on
   */
  filterText(aString){
    // We need to determine if the current inner content of this
    // component represents a "master" list, from which we will filter.
    // If it does, we need to cache it so that it is always what gets
    // filtered against, otherwise we would lose information permanently
    // each filter when swapping out elements.
    const source = this.getFilterSource();
    if(aString && aString !== ""){
      const filtered = Array.from(source.querySelectorAll(this.filterOptionsSelector))
            .filter(option => {
              return !option.textContent.toLowerCase().includes(aString.toLowerCase());
            });

      filtered.forEach(option => option.remove());

      // Next, determine if there are groups whose
      // options have all been ignored, ie they have none
      Array.from(source.querySelectorAll(`[role="group"]`))
        .forEach(groupElement => {
          if(!groupElement.querySelectorAll(`[role="option"]`).length){
            groupElement.remove();
          }
        });
      this.setAttribute("filtered", true);
    } else {
      this.removeAttribute("filtered");
    }
    
    this.innerHTML = source.innerHTML;

    this.dispatchEvent(
      new CustomEvent("wx:popup-filter", {
        bubbles: true,
        cancelable: true
      })
    );
  }

  /**
   * Clear the filter, and restore the listbox options to
   * their initial unfiltered/full state.
   * We first check to see if there is in fact any existing cache
   * and a corresponding hidden input specifying that the listbox
   * is currently being filtered.
   * If present, then we restore from the cached filter source.
   */
  clearFilter(){
    const inputSelector = `input[type="hidden"][name="filtered"][value="true"]`;
    if(this._cachedItems && this._cachedItems.querySelector(inputSelector)){
      this.innerHTML = this.getFilterSource().innerHTML;
    }
    this.removeAttribute("filtered");
  }

  /**
   * Returns a cloned element or document fragment corresponding
   * to the originally slotted content for the listbox.
   * At call time, this method will also lazily assign the original
   * element or document fragment to the cache, so it can be retrieved later.
   * In order to verify that we are not re-caching filtered items, we add a
   * hidden input to the cached version when it is first lazily assigned.
   * The cloned filter source then serves as the basis for any future filtering
   * of options for display/presence within the listbox.
   */
  getFilterSource(){
    const inputSelector = `input[type="hidden"][name="filtered"][value="true"]`;
    if(this._cachedItems && this._cachedItems.querySelector(inputSelector)){
      // If we get to this point, that means that the current innerHTML of the
      // listbox already represents filtered data, and that the _cachedItems
      // are the source of truth for further filtering
      return this._cachedItems.cloneNode(true);
    } else {
      // Otherwise, we assume that the current innerHTML of the component
      // is the full (not filtered) source of truth for the list.
      // We need to add the hidden input to it and then cache the content
      const temp = document.createElement("div");
      temp.innerHTML = this.innerHTML;
      const input = document.createElement("input");
      input.setAttribute("type", "hidden");
      input.setAttribute("name", "filtered");
      input.setAttribute("value", "true");
      temp.append(input);
      this._cachedItems = temp;
      return this._cachedItems.cloneNode(true);
    }
  }

  /**
   * We only want to re-initialize elements if the listbox
   * is currently being filtered (because the options will
   * be newly cloned elements from the filter source)
   */
  handleItemsChanged(event){
    if(!this.isFiltered){
      super.handleItemsChanged(event);
    }
  }

  /**
   * When calling selectItem on filtered options,
   * we also need to update the corresponding option element
   * that lives in the cached filter source. If we don't do this,
   * selection will disappear on further filtering, even if the
   * aforementioned selected item is not filtered out.
   */
  selectItem(element){
    if(!element){
      return super.selectItem(element);
    }
    if(this._cachedItems){
      const selectionIndex = element.dataset.optionIndex;
      Array.from(
        this._cachedItems.querySelectorAll(`[role="option"]`)
      ).forEach(option => {
        if(option.matches(`[role="option"][data-option-index="${selectionIndex}"]`)){
          option.setAttribute("aria-selected", true);
        } else {
          option.removeAttribute("aria-selected");
        }
      });
    }

    super.selectItem(element);
    this.clearFilter();
  }

  get isFiltered(){
    return this.getAttribute("filtered") === "true";
  }
}

if(!window.customElements.get("wx-filterable-listbox")){
  window.customElements.define("wx-filterable-listbox", FilterableListbox);
}
