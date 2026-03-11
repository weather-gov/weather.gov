class WxExpander {
  #target;
  #expandButton;
  #collapseButton;

  constructor(node) {
    const targetSelector = node.getAttribute("wx-expander");
    if (targetSelector) {
      this.#target = document.querySelector(targetSelector);
      if (this.#target) {
        this.#expandButton = node.querySelector("button[wx-expand]");
        this.#collapseButton = node.querySelector("button[wx-collapse]");

        if (this.#expandButton && this.#collapseButton) {
          this.#expandButton.addEventListener("click", this.#expand.bind(this));
          this.#collapseButton.addEventListener(
            "click",
            this.#collapse.bind(this),
          );
        } else {
          throw new Error("WxExpander: one of the buttons is not found");
        }
      } else {
        throw new Error(`WxExpander: target ${targetSelector} not found`);
      }
    } else {
      throw new Error("WxExpander does not have a target");
    }
  }

  #expand() {
    this.#target.classList.remove("display-none");
    if (this.#expandButton) {
      this.#expandButton.classList.add("display-none");
    }
    if (this.#collapseButton) {
      this.#collapseButton.classList.remove("display-none");
      this.#collapseButton.focus();
    }
  }

  #collapse() {
    this.#target.classList.add("display-none");
    if (this.#expandButton) {
      this.#expandButton.classList.remove("display-none");
      this.#expandButton.focus();
    }
    if (this.#collapseButton) {
      this.#collapseButton.classList.add("display-none");
    }
  }
}

document
  .querySelectorAll("[wx-expander]")
  .forEach((node) => new WxExpander(node));
