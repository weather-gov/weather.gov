const hourlyTableTemplateString = `
<style>
:host {
display: block;
position: relative;
}
.scroll-arrow {
display: block;
width: 40px;
height: 40px;
background-color: #A9AEB1;
border-radius: 100%;
position: absolute;
top: -20px;
z-index: 1000;
}

#arrow-left {
left: 16px;
}

#arrow-right {
right: 16px;
}

#table-wrapper {
display: block;
overflow-y: hidden;
}
</style>
<div id="arrow-left" class="scroll-arrow"></div>
<div id="arrow-right" class="scroll-arrow"></div>
<div id="table-wrapper"/>
<slot></slot>
</div>
`;

class HourlyTable extends HTMLElement {
  constructor(){
    super();

    this.template = document.createElement("template");
    this.template.innerHTML = hourlyTableTemplateString;
    this.attachShadow({mode: "open"});
    this.shadowRoot.append(
      this.template.content.cloneNode(true)
    );

    // Bound component methods
    this.handleArrowButtonClick = this.handleArrowButtonClick.bind(this);
  }

  connectedCallback(){
    Array.from(this.shadowRoot.querySelectorAll(".scroll-arrow")).forEach(arrowButton => {
      arrowButton.addEventListener("click", this.handleArrowButtonClick);
    });
  }

  disconnectedCallback(){
    Array.from(this.shadowRoot.querySelectorAll(".scroll-arrow")).forEach(arrowButton => {
      arrowButton.removeEventListener("click", this.handleArrowButtonClick);
    });
  }

  handleArrowButtonClick(event){
    const wrapper = this.shadowRoot.getElementById("table-wrapper");

    if(event.target.id === "arrow-right"){
      this.clickScrollRight(wrapper);
    } else if(event.target.id === "arrow-left" ){
      this.clickScrollLeft(wrapper);
    }
  }

  clickScrollRight(wrapper){
    const cellsToRight = Array.from(this.querySelectorAll("table tr:nth-child(2) td")).filter(cell => {
      const diff = (cell.offsetLeft - wrapper.scrollLeft);
      return diff > 16;
    });
    
    if(cellsToRight.length){
      wrapper.scrollTo({left: cellsToRight[0].offsetLeft - 16, behavior: "smooth"});
    }
  }

  clickScrollLeft(wrapper){
    const cellsToLeft = Array.from(this.querySelectorAll("table tr:nth-child(2) td")).filter(cell => {
      const diff = cell.offsetLeft - wrapper.scrollLeft;
      return diff < 16;
    });
    
    if(cellsToLeft.length){
      wrapper.scrollTo({left: cellsToLeft.at(-1).offsetLeft - 16, behavior: "smooth"});
    } else {
      wrapper.scrollTo({left: 0, behavior: "smooth"});
    }
  }
};


window.customElements.define("hourly-table", HourlyTable);
