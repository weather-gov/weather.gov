class HourlyTable extends HTMLElement {
  constructor(){
    super();

    // Bound component methods
    this.handleArrowButtonClick = this.handleArrowButtonClick.bind(this);
  }

  connectedCallback(){
    Array.from(this.querySelectorAll(".wx-scroll-button")).forEach(arrowButton => {
      arrowButton.addEventListener("click", this.handleArrowButtonClick);
    });
  }

  disconnectedCallback(){
    Array.from(this.querySelectorAll(".wx-scroll-button")).forEach(arrowButton => {
      arrowButton.removeEventListener("click", this.handleArrowButtonClick);
    });
  }

  handleArrowButtonClick(event){
    const wrapper = this.querySelector(".usa-table-container--scrollable");
    console.log(event.currentTarget.dataset.direction);

    if(event.currentTarget.dataset.direction === "right"){
      this.clickScrollRight(wrapper);
    } else if(event.currentTarget.dataset.direction === "left" ){
      this.clickScrollLeft(wrapper);
    }
  }

  clickScrollRight(wrapper){
    const cellsToRight = Array.from(this.querySelectorAll("table tr:nth-child(3) td")).filter(cell => {
      const diff = (cell.offsetLeft - wrapper.scrollLeft);
      return diff > 16;
    });

    if(cellsToRight.length){
      wrapper.scrollTo({left: cellsToRight[0].offsetLeft - 16, behavior: "smooth"});
    }
  }

  clickScrollLeft(wrapper){
    const cellsToLeft = Array.from(this.querySelectorAll("table tr:nth-child(3) td")).filter(cell => {
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
