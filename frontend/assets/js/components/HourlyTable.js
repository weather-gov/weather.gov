class HourlyTable extends HTMLElement {
  constructor() {
    super();

    // Bound component methods
    this.handleArrowButtonClick = this.handleArrowButtonClick.bind(this);
    this.handleScrollEvent = this.handleScrollEvent.bind(this);
  }

  connectedCallback() {
    Array.from(this.querySelectorAll(".wx-scroll-button")).forEach(
      (arrowButton) => {
        arrowButton.addEventListener("click", this.handleArrowButtonClick);
      },
    );
    const wrapper = this.querySelector(".usa-table-container--scrollable");
    if(wrapper){
      wrapper.addEventListener("scroll", this.handleScrollEvent);
    }
  }

  disconnectedCallback() {
    Array.from(this.querySelectorAll(".wx-scroll-button")).forEach(
      (arrowButton) => {
        arrowButton.removeEventListener("click", this.handleArrowButtonClick);
      },
    );
    const wrapper = this.querySelector(".usa-table-container--scrollable");
    if(wrapper){
      wrapper.removeEventListener("scroll", this.handleScrollEvent);
    }
  }

  handleArrowButtonClick(event) {
    const wrapper = this.querySelector(".usa-table-container--scrollable");

    if (event.currentTarget.dataset.direction === "right") {
      this.clickScrollRight(wrapper);
    } else if (event.currentTarget.dataset.direction === "left") {
      this.clickScrollLeft(wrapper);
    }
  }

  clickScrollRight(wrapper) {
    const containerWidth = wrapper.getBoundingClientRect().width;
    const firstColumnWidth = this.querySelector("table tbody:last-child tr:last-child th").getBoundingClientRect().width;
    const visibleWidth = containerWidth;
    const rightSide = wrapper.scrollLeft + visibleWidth;

    const nextCol = Array.from(this.querySelectorAll("table tbody:last-child tr:last-child td"))
          .find(el => {
            const left = el.offsetLeft;
            const right = el.offsetLeft + el.offsetWidth;
            return left <= rightSide && right >= rightSide;
          });   

    if (nextCol) {
      let nextLeftPos = nextCol.offsetLeft - firstColumnWidth - 16;
      if(Math.floor(nextLeftPos) <= Math.floor(wrapper.scrollLeft)){
        nextLeftPos = nextCol.nextElementSibling.offsetLeft - firstColumnWidth - 16;
      }
      
      wrapper.scrollTo({
        left: nextLeftPos,
        behavior: "smooth",
      });
    }
  }

  clickScrollLeft(wrapper) {
    const containerWidth = wrapper.getBoundingClientRect().width;
    const firstColumnWidth = this.querySelector("table tbody:last-child tr:last-child th").getBoundingClientRect().width;
    const visibleWidth = containerWidth - firstColumnWidth;
    const leftSide = wrapper.scrollLeft - visibleWidth + firstColumnWidth;

    const prevCol = Array.from(this.querySelectorAll("table tbody:last-child tr:last-child td"))
          .find(el => {
            const left = el.offsetLeft;
            const right = el.offsetLeft + el.offsetWidth;
            return left <= leftSide && right >= leftSide;
          });

    if (prevCol) {
      let nextLeftPos = prevCol.nextElementSibling.offsetLeft - firstColumnWidth - 16;
      if(Math.floor(nextLeftPos) >= Math.floor(wrapper.scrollLeft)){
        nextLeftPos = prevCol.offsetLeft - firstColumnWidth - 16;
      }

      wrapper.scrollTo({
        left: nextLeftPos,
        behavior: "smooth",
      });
    } else {
      wrapper.scrollTo({ left: 0, behavior: "smooth" });
    }
  }

  handleScrollEvent(event){
    if(event.target.scrollLeft > 0){
      this.setAttribute("data-scrolled", "true");
    } else {
      this.setAttribute("data-scrolled", "false");
    }
  }
}

window.customElements.define("wx-hourly-table", HourlyTable);
