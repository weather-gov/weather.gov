class HourlyToggle extends HTMLElement {
  constructor() {
    super();

    // Bind methods
    this.toggle = this.toggle.bind(this);
    this.updateText = this.updateText.bind(this);
    this.updateIcon = this.updateIcon.bind(this);
  }

  connectedCallback() {
    // Show the inner text label coresponding
    // to the expanded value
    this.updateText();

    // Set up appropriate events
    this.addEventListener("click", this.handleClick);
    this.addEventListener("keydown", this.handleKeyDown);
  }

  disconnectedCallback() {
    // Remove event listeners
    this.removeEventListener("click", this.handleClick);
    this.removeEventListener("keydown", this.handleKeyDown);
  }

  handleKeyDown(event) {
    if (event.key === "Enter" || event.key === "Space") {
      this.toggle();
    }
  }

  handleClick() {
    this.toggle();
  }

  toggle() {
    if (this.getAttribute("aria-expanded") === "false") {
      this.setAttribute("aria-expanded", "true");
    } else {
      this.setAttribute("aria-expanded", "false");
    }
    this.updateText();
    this.updateIcon();
    this.updateWidth();
  }

  updateText() {
    const textArea = this.querySelector(".toggle-text");
    if (this.getAttribute("aria-expanded") === "true") {
      textArea.innerText = this.getAttribute("data-expanded-text");
    } else {
      textArea.innerText = this.getAttribute("data-hidden-text");
    }
  }

  updateIcon() {
    const iconUseEl = this.querySelector("svg use");
    if (iconUseEl) {
      let iconHref = iconUseEl.getAttribute("xlink:href").split("#")[0];
      const isShowing = this.getAttribute("aria-expanded") === "true";
      if (isShowing) {
        iconHref += `#${this.getAttribute("data-expanded-icon-name")}`;
      } else {
        iconHref += `#${this.getAttribute("data-hidden-icon-name")}`;
      }
      iconUseEl.setAttributeNS(
        "http://www.w3.org/1999/xlink",
        "xlink:href",
        iconHref,
      );
    }
  }

  updateWidth() {
    this.parentNode.classList.toggle("tablet-lg:grid-offset-2");
    this.parentNode.classList.toggle("tablet-lg:grid-col-8");
    this.parentNode.classList.toggle("tablet-lg:grid-col-12");
  }
}

window.customElements.define("wx-hourly-toggle", HourlyToggle);
