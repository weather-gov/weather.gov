/**
 * State Index Filter component
 * ------------------------------------------------
 * This component handles the events from a text input
 * field. It uses a fuzzy match to hide or show state links
 * from a list of state names.
 * Unlike its more complex County variant, it has no
 * in memory DOM and purely hides/shows the
 * constituent links using the display-none class.
 */
class StateIndexFilter extends HTMLElement {
  constructor(){
    super();

    // Bound methods
    this.handleInput = this.handleInput.bind(this);
  }

  connectedCallback(){
    this.input = document.getElementById("state-filter-input");
    this.list = document.getElementById("state-index-list");

    this.addEventListener("input", this.handleInput);
  }

  disconnectedCallback(){
    if(this.input){
      this.input.removeEventListener("input", this.handleInput);
    }
  }

  handleInput(event){
    if(!this.input.value || this.input.value === ""){
      return this.list.querySelectorAll("li").forEach(li => {
        li.classList.remove("display-none");
      });
    }

    const term = this.input.value.toLowerCase();
    return this.list.querySelectorAll("li")
      .forEach(element => {
        if(element.textContent.toLowerCase().includes(term)){
          element.classList.remove("display-none");
        } else {
          element.classList.add("display-none");
        }
      });
  }
}

window.customElements.define("wx-state-index-filter", StateIndexFilter);
