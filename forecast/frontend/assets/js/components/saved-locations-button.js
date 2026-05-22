/**
 * Saved location button handler
 */
import {
  hasSavedLocation,
  addSavedLocation,
  removeSavedLocation,
} from "./saved-locations.js";

class SavedLocationsButton extends HTMLElement {
  constructor() {
    super();

    this.bindEventListeners = this.bindEventListeners.bind(this);
    this.unbindEventListeners = this.unbindEventListeners.bind(this);

    this.btnEl = this.querySelector("button");

    this.ariaCheckedAttribute = "aria-checked";

    this.placeLocation = this.dataset?.place ?? "";
    this.placeUrl = this.dataset?.url ?? "";

    this.setInitialSaveStatus = this.setInitialSaveStatus.bind(this);
    this.setSavedStatus = this.setSavedStatus.bind(this);
    this.setUnsavedStatus = this.setUnsavedStatus.bind(this);

    this.handleClick = this.handleClick.bind(this);
    this.onLocationAdd = this.onLocationAdd.bind(this);
    this.onLocationRemove = this.onLocationRemove.bind(this);
  }

  connectedCallback() {
    this.bindEventListeners();
    this.setInitialSaveStatus();
  }

  disconnectedCallback() {
    this.unbindEventListeners();
  }

  bindEventListeners() {
    this.btnEl.addEventListener("click", this.handleClick);
    window.addEventListener(
      "wx-saved-locations:section-add",
      this.onLocationAdd,
    );
    window.addEventListener(
      "wx-saved-locations:section-remove",
      this.onLocationRemove,
    );
  }

  unbindEventListeners() {
    this.removeEventListener("click", this.handleClick);
    window.removeEventListener(
      "wx-saved-locations:section-add",
      this.onLocationAdd,
    );
    window.removeEventListener(
      "wx-saved-locations:section-remove",
      this.onLocationRemove,
    );
  }

  onLocationAdd(e) {
    const detail = e.detail ?? {};
    if (detail?.text === this.placeLocation) {
      this.setSavedStatus();
    }
  }

  onLocationRemove(e) {
    const detail = e.detail ?? {};
    if (detail?.text === this.placeLocation) {
      this.setUnsavedStatus();
    }
  }

  setInitialSaveStatus() {
    const isSaved = hasSavedLocation(this.placeLocation);

    if (isSaved) {
      this.setSavedStatus();
    } else {
      this.setUnsavedStatus();
    }
  }

  handleClick(e) {
    if (this.btnEl.getAttribute(this.ariaCheckedAttribute) === "true") {
      this.setUnsavedStatus();
      removeSavedLocation(this.placeLocation);
      window.dispatchEvent(
        new CustomEvent("wx-saved-locations:button-remove", {
          detail: {
            text: this.placeLocation,
            url: this.placeUrl,
          },
        }),
      );
    } else {
      this.setSavedStatus();
      addSavedLocation({
        text: this.placeLocation,
        url: this.placeUrl,
      });
      window.dispatchEvent(
        new CustomEvent("wx-saved-locations:button-add", {
          detail: {
            text: this.placeLocation,
            url: this.placeUrl,
          },
        }),
      );
    }
  }

  setSavedStatus() {
    this.btnEl.setAttribute(this.ariaCheckedAttribute, "true");
  }

  setUnsavedStatus() {
    this.btnEl.setAttribute(this.ariaCheckedAttribute, "false");
  }
}

if (!window.customElements.get("wx-saved-locations-button")) {
  window.customElements.define(
    "wx-saved-locations-button",
    SavedLocationsButton,
  );
}
