/**
 * Saved location section handler
 */
import {
  getSavedLocations,
  hasSavedLocation,
  addSavedLocation,
  removeSavedLocation,
} from "./saved-locations.js";

class SavedLocationsSection extends HTMLElement {
  constructor() {
    super();

    this.displayClass = "";
    this.hideClass = "display-none";
    this.buttonItemIdPrefix = "saved-locations-section-btn-";
    this.ariaCheckedAttribute = "aria-checked";

    this.savedLocations = {};

    this.sectionType = this.dataset?.type ?? "front";
    this.sectionCols = this.dataset?.columns ?? "true";
    this.sectionEl = this.querySelector(
      `#saved-locations-section-${this.sectionType}`,
    );
    this.templateLi = this.querySelector(
      `#saved-locations-section-${this.sectionType}-li`,
    );

    this.bindEventListeners = this.bindEventListeners.bind(this);
    this.unbindEventlisteners = this.unbindEventlisteners.bind(this);

    this.initSection = this.initSection.bind(this);
    this.hideList = this.hideList.bind(this);
    this.showList = this.showList.bind(this);

    this.addListButtonEvents = this.addListButtonEvents.bind(this);
    this.createList = this.createList.bind(this);
    this.createListItem = this.createListItem.bind(this);
    this.getListColumnClass = this.getListColumnClassList.bind(this);

    this.onListButtonClick = this.onListButtonClick.bind(this);
    this.onSavedLocationsButtonAdd = this.onSavedLocationsButtonAdd.bind(this);
    this.onSavedLocationsButtonRemove =
      this.onSavedLocationsButtonRemove.bind(this);
    this.onSectionLocationAdd = this.onSectionLocationAdd.bind(this);
    this.onSectionLocationRemove = this.onSectionLocationRemove.bind(this);
  }

  connectedCallback() {
    this.bindEventListeners();
    this.initSection();
  }

  disconnectedCallback() {
    this.unbindEventlisteners();
  }

  bindEventListeners() {
    window.addEventListener(
      "wx-saved-locations:button-add",
      this.onSavedLocationsButtonAdd,
    );
    window.addEventListener(
      "wx-saved-locations:button-remove",
      this.onSavedLocationsButtonRemove,
    );
    window.addEventListener(
      "wx-saved-locations:section-add",
      this.onSectionLocationAdd,
    );
    window.addEventListener(
      "wx-saved-locations:section-remove",
      this.onSectionLocationRemove,
    );
  }
  unbindEventlisteners() {
    window.removeEventListener(
      "wx-saved-locations:button-add",
      this.onSavedLocationsButtonAdd,
    );
    window.removeEventListener(
      "wx-saved-locations:button-remove",
      this.onSavedLocationsButtonRemove,
    );
    window.removeEventListener(
      "wx-saved-locations:section-add",
      this.onSectionLocationAdd,
    );
    window.removeEventListener(
      "wx-saved-locations:section-remove",
      this.onSectionLocationRemove,
    );
  }

  initSection() {
    const currentLocations = getSavedLocations();
    if (currentLocations?.length) {
      this.createList(currentLocations);
      this.showList();
    } else {
      this.hideList();
    }
  }

  hideList() {
    this.sectionEl?.classList?.add(this.hideClass);
  }

  showList() {
    this.sectionEl?.classList?.remove(this.hideClass);
  }

  cleanString(str) {
    return str?.trim()?.replace(/\W/g, "")?.toLowerCase();
  }

  createList(locations) {
    const listUl = this.querySelector("ul");
    const listColumnClass = this.getListColumnClassList(locations.length);
    if (listColumnClass?.length) listUl.classList.add(...listColumnClass);

    const newElems = [];

    for (let index = 0; index < locations.length; index++) {
      const { text, url } = locations[index];
      const element = this.createListItem(text, url);
      newElems.push(element);
    }
    listUl.replaceChildren();
    listUl.append(...newElems);
    this.addListButtonEvents();
  }

  createListItem(text, url) {
    const cleanedText = this.cleanString(text);
    this.savedLocations[text] = true;

    // Clone the template
    const templateLi = this.templateLi;
    const clonedLi = document.importNode(templateLi.content, true);

    // Update the template
    const liButton = clonedLi.querySelector("button");
    liButton.id = `${liButton.id}${cleanedText}`;
    liButton.setAttribute("data-loctext", text);
    liButton.setAttribute("data-locurl", url);
    liButton.setAttribute("aria-label", `Saved location ${text}`);

    const liAnchor = clonedLi.querySelector("a");
    const anchorId = `saved-locations-section-label-${cleanedText}`;
    liAnchor.id = anchorId;
    liAnchor.setAttribute("href", url);
    liAnchor.innerText = text;

    return clonedLi;
  }

  getListColumnClassList(itemLength) {
    if (this.sectionCols === "false") return "";
    const columnBase = "use-columns",
      classRange = [
        { min: 25, class: "--x4" },
        { min: 17, class: "--x3" },
        { min: 9, class: "--x2" },
      ];
    let columnPostfix;

    for (let index = 0; index < classRange.length; index++) {
      if (itemLength >= classRange[index].min) {
        columnPostfix = classRange[index].class;
        break;
      }
    }

    return columnPostfix ? [columnBase, `${columnBase}${columnPostfix}`] : [];
  }

  addListButtonEvents() {
    const buttonElems = this.querySelectorAll("button.saved-locations-button");
    buttonElems.forEach((btn) => {
      btn.addEventListener("click", this.onListButtonClick);
    });
  }

  onListButtonClick(e) {
    const currentTarget = e.currentTarget;
    const currentLoc = currentTarget.dataset.loctext;
    const currentUrl = currentTarget.dataset.locurl;
    if (this.savedLocations[currentLoc] === true) {
      currentTarget.setAttribute(this.ariaCheckedAttribute, false);
      this.savedLocations[currentLoc] = false;
      removeSavedLocation(currentLoc);
      window.dispatchEvent(
        new CustomEvent("wx-saved-locations:section-remove", {
          detail: {
            text: currentLoc,
            url: currentUrl,
            caller: this.sectionType,
          },
        }),
      );
    } else {
      currentTarget.setAttribute(this.ariaCheckedAttribute, true);
      this.savedLocations[currentLoc] = true;
      addSavedLocation({ text: currentLoc, url: currentTarget.dataset.locurl });
      window.dispatchEvent(
        new CustomEvent("wx-saved-locations:section-add", {
          detail: {
            text: currentLoc,
            url: currentUrl,
            caller: this.sectionType,
          },
        }),
      );
    }
  }

  onSavedLocationsButtonAdd(e) {
    // If already in list, set the button to saved, otherwise add to the list
    const detail = e.detail ?? {};
    const addLocation = detail?.text ?? "";
    if (addLocation in this.savedLocations) {
      if (this.savedLocations[addLocation] === false) {
        // Get the button
        const buttonId = `${this.buttonItemIdPrefix}${this.cleanString(addLocation)}`;
        const buttonElem = this.querySelector(`#${buttonId}`);
        buttonElem.setAttribute(this.ariaCheckedAttribute, true);
        this.savedLocations[addLocation] = true;
      }
    } else {
      // Find where to insert new node
      const currentSavedLocations = getSavedLocations();
      const currentList = this.querySelectorAll("li");
      const currentListUl = this.querySelector("ul");

      const currentLocationIndex = currentSavedLocations.findIndex((loc) => {
        return addLocation === loc.text;
      });

      if (currentLocationIndex !== -1) {
        // Gather previous list's column class and get new class
        const currentColumnClass = this.getListColumnClassList(
          currentList.length,
        );
        const newColumnClass = this.getListColumnClassList(
          currentList.length + 1,
        );

        // Create new DOM element
        const currentLocationItem = currentSavedLocations[currentLocationIndex];
        const newListItem = this.createListItem(
          currentLocationItem.text,
          currentLocationItem.url,
        );

        // Attach event listener to button
        const newListButton = newListItem.querySelector(
          "button.saved-locations-button",
        );
        newListButton.addEventListener("click", this.onListButtonClick);

        // Insert into the list
        if (currentList?.length === 0) {
          currentListUl.append(newListItem);
        } else if (currentLocationIndex === 0) {
          currentList[0].before(newListItem);
        } else {
          currentList[currentLocationIndex - 1].after(newListItem);
        }
        // Update column class
        if (currentColumnClass?.length)
          currentListUl.classList.remove(...currentColumnClass);
        if (newColumnClass?.length)
          currentListUl.classList.add(...newColumnClass);

        // Update local tracking
        this.savedLocations[addLocation] = true;

        // If previously hidden, now show
        if (currentList?.length === 0) {
          this.showList();
        }
      }
    }
  }

  onSavedLocationsButtonRemove(e) {
    // Disable the necessary button but don't remove from the list yet
    const detail = e.detail ?? {};

    const addLocation = detail?.text ?? "";
    if (addLocation in this.savedLocations) {
      if (this.savedLocations[addLocation] === true) {
        // Get the button and disable
        const buttonId = `${this.buttonItemIdPrefix}${this.cleanString(addLocation)}`;
        const buttonElem = this.querySelector(`#${buttonId}`);
        buttonElem.setAttribute(this.ariaCheckedAttribute, false);
        this.savedLocations[addLocation] = false;
      }
    }
  }

  onSectionLocationAdd(e) {
    // Another section has set item to saved, now update this list also
    const detail = e.detail ?? {};
    const caller = detail?.caller;
    if (caller === this.sectionType) return;

    const addLocation = detail?.text ?? "";

    if (addLocation in this.savedLocations) {
      if (this.savedLocations[addLocation] === false) {
        // Get the button
        const buttonId = `${this.buttonItemIdPrefix}${this.cleanString(addLocation)}`;
        const buttonElem = this.querySelector(`#${buttonId}`);
        buttonElem.setAttribute(this.ariaCheckedAttribute, true);
        this.savedLocations[addLocation] = true;
      }
    }
  }

  onSectionLocationRemove(e) {
    // Another section has set item to unsaved, now update this list also
    const detail = e.detail ?? {};
    const caller = detail?.caller;
    if (caller === this.sectionType) return;

    const removeLocation = detail?.text ?? "";

    if (removeLocation in this.savedLocations) {
      if (this.savedLocations[removeLocation] === true) {
        // Get the button and disable
        const buttonId = `${this.buttonItemIdPrefix}${this.cleanString(removeLocation)}`;
        const buttonElem = this.querySelector(`#${buttonId}`);
        buttonElem.setAttribute(this.ariaCheckedAttribute, false);
        this.savedLocations[removeLocation] = false;
      }
    }
  }
}

if (!window.customElements.get("wx-saved-locations-section")) {
  window.customElements.define(
    "wx-saved-locations-section",
    SavedLocationsSection,
  );
}
