/**
 * Accordion is a custom HTML element which toggles the visibility of a element.
 *
 * Example usage:
 *
 *    <wx-accordion>
 *      <button type="button"
 *        aria-expanded="true"
 *        aria-controls="a3"
 *      >
 *        Third Amendment (open)
 *      </button>
 *      <template>
 *        Third Amendment (closed)
 *      </template>
 *      <div id="a3" class="usa-prose">
 *        <p>
 *          No Soldier shall, in time of peace be quartered in any house,
 *          without the consent of the Owner, nor in time of war,
 *          but in a manner to be prescribed by law.
 *        </p>
 *      </div>
 *    </wx-accordion>
 *
 * The `<template>` tag can be used to provide alternative content for the button
 * when the accordion is toggled shut.
 *
 * The `<button>` must start in the `aria-expanded="true"` state. This will render
 * the contents of the accordion accessible, even if the JavaScript fails.
 *
 * The target area does _not_ need to be a child of `<wx-accordion>`.
 */
class Accordion extends HTMLElement {
  target;
  template;
  buttonContent = {
    expanded: null,
    collapsed: null,
  };
  toggleButton;

  async connectedCallback() {
    // attach onClick event listener to the toggle button
    this.toggleButton = this.querySelector("button[aria-expanded='true']");
    if (!this.toggleButton) throw new Error("Accordion: button not found");
    this.toggleButton.addEventListener("click", this.toggle);

    // clone the toggle button's content into memory
    this.template = this.querySelector("template");
    this.buttonContent.expanded = document.createDocumentFragment();
    this.buttonContent.expanded.append(
      ...this.toggleButton.cloneNode(true).childNodes,
    );
    this.buttonContent.collapsed = this.template?.content?.cloneNode?.(true);

    // find the element whose visibility is to be toggled
    const contentId = this.toggleButton.getAttribute("aria-controls");
    if (!contentId)
      throw new Error("Accordion: missing aria-controls on button");
    this.target = document.body.querySelector(`#${contentId}`);
    if (!this.target) throw new Error("Accordion: target not found");

    this.collapse();
  }

  disconnectedCallback() {
    this.toggleButton?.removeEventListener("click", this.toggle);
  }

  collapse = () => {
    this.target.classList.add("display-none");
    this.toggleButton.setAttribute("aria-expanded", "false");
    if (this.template) {
      this.toggleButton.replaceChildren(
        this.buttonContent.collapsed.cloneNode(true),
      );
    }
  };

  expand = () => {
    this.target.classList.remove("display-none");
    this.toggleButton.setAttribute("aria-expanded", "true");
    if (this.template) {
      this.toggleButton.replaceChildren(
        this.buttonContent.expanded.cloneNode(true),
      );
    }
  };

  toggle = () => {
    if (this.toggleButton) {
      const isCollapsed =
        this.toggleButton.getAttribute("aria-expanded") !== "true";
      if (isCollapsed) {
        this.expand();
      } else {
        this.collapse();
      }
    }
  };
}

if (!window.customElements.get("wx-accordion")) {
  window.customElements.define("wx-accordion", Accordion);
}
