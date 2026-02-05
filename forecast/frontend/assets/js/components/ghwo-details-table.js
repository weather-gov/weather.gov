class GHWODetailsTable extends HTMLElement {
  constructor() {
    super();

    this.handleScrollButtonClick = this.handleScrollButtonClick.bind(this);
    this.handleScroll = this.handleScroll.bind(this);
  }

  connectedCallback() {
    this.addEventListener("click", this.handleClick);
    this.addEventListener("keydown", this.handleKeyDown);
    const wrapper = this.querySelector(".ghwo-risk-details-table-wrapper");
    if (wrapper) {
      wrapper.addEventListener("scroll", this.handleScroll);
    }
    Array.from(this.querySelectorAll(".wx-scroll-button")).forEach(
      (scrollButton) => {
        scrollButton.addEventListener("click", this.handleScrollButtonClick);
      },
    );
  }

  disconnectedCallback() {
    this.removeEventListener("click", this.handleClick);
    this.removeEventListener("keydown", this.handleKeyDown);
    const wrapper = this.querySelector(".ghwo-risk-details-table-wrapper");
    if (wrapper) {
      wrapper.removeEventListener("scroll", this.handleScroll);
    }
    Array.from(this.querySelectorAll(".wx-scroll-button")).forEach(
      (scrollButton) => {
        scrollButton.removeEventListener("click", this.handleScrollButtonClick);
      },
    );
  }

  handleClick(event) {
    if (event.target.matches(".ghwo-chiclet:not(.chiclet-detail-cell-empty)")) {
      event.currentTarget.handleChicletClick(event);
    }
  }

  handleScrollButtonClick(event) {
    const wrapper = this.querySelector(".ghwo-risk-details-table-wrapper");
    if (event.currentTarget.dataset.direction === "left") {
      this.scrollClickLeft(wrapper);
    } else if (event.currentTarget.dataset.direction === "right") {
      this.scrollClickRight(wrapper);
    }
  }

  handleChicletClick(event) {
    // Buttons and panes have matching data attributes
    // within the component.
    // To uniquely identify a pane, we need the day number
    // and the risk factor. These are present on the button
    // that was clicked
    const riskFactor = event.target.dataset.riskFactor;
    const dayNumber = event.target.dataset.dayNumber;

    // Update the clicked chiclet to be aria-selected,
    // and all others to be not selected
    const table = event.target.closest("table");
    Array.from(table.querySelectorAll(`.ghwo-chiclet[role="button"]`)).forEach(
      (button) => {
        button.setAttribute("aria-selected", button === event.target);
      },
    );

    // Loop through all the panes. Update the aria-hidden
    // attribute to true if the pane matches what was clicked.
    // False otherwise.
    Array.from(this.querySelectorAll(".ghwo-details-pane")).forEach((pane) => {
      const matchingSelector = `[data-day-number="${dayNumber}"][data-risk-factor="${riskFactor}"]`;
      if (pane.matches(matchingSelector)) {
        pane.setAttribute("aria-hidden", "false");
      } else {
        pane.setAttribute("aria-hidden", "true");
      }
    });
  }

  scrollClickLeft(wrapper) {
    const containerWidth = wrapper.getBoundingClientRect().width;
    const firstColumnWidth = this.querySelector(
      "table tbody:last-child tr:last-child th",
    ).getBoundingClientRect().width;
    const visibleWidth = containerWidth - firstColumnWidth;
    const leftSide = wrapper.scrollLeft - visibleWidth + firstColumnWidth;

    const prevCol = Array.from(
      wrapper.querySelectorAll("table tbody tr:last-child td"),
    ).find((el) => {
      const left = el.offsetLeft;
      const right = el.offsetLeft + el.offsetWidth;
      return left <= leftSide && right >= leftSide;
    });

    if (prevCol) {
      let nextLeftPos =
        prevCol.nextElementSibling.offsetLeft - firstColumnWidth - 2;
      if (Math.floor(nextLeftPos) >= Math.floor(wrapper.scrollLeft)) {
        nextLeftPos = prevCol.offsetLeft - firstColumnWidth - 2;
      }

      wrapper.scrollTo({
        left: nextLeftPos,
        behavior: "smooth",
      });
    } else {
      wrapper.scrollTo({ left: 0, behavior: "smooth" });
    }
  }

  scrollClickRight(wrapper) {
    const containerWidth = wrapper.getBoundingClientRect().width;
    const firstColumnWidth = wrapper
      .querySelector("table tbody tr:last-child th")
      .getBoundingClientRect().width;
    const visibleWidth = containerWidth;
    const rightSide = wrapper.scrollLeft + visibleWidth;

    const nextCol = Array.from(
      wrapper.querySelectorAll("table tbody tr:last-child td"),
    ).find((el) => {
      const left = el.offsetLeft;
      const right = el.offsetLeft + el.offsetWidth;
      return left <= rightSide && right >= rightSide;
    });

    if (nextCol) {
      let nextLeftPos = nextCol.offsetLeft - firstColumnWidth - 2;
      if (Math.floor(nextLeftPos) <= Math.floor(wrapper.scrollLeft)) {
        nextLeftPos =
          nextCol.nextElementSibling.offsetLeft - firstColumnWidth - 2;
      }

      wrapper.scrollTo({
        left: nextLeftPos,
        behavior: "smooth",
      });
    }
  }

  handleKeyDown(event) {
    if (event.key === "ArrowRight") {
      event.currentTarget.arrowRight(event);
    } else if (event.key === "ArrowLeft") {
      event.currentTarget.arrowLeft(event);
    } else if (event.key === "ArrowDown") {
      event.currentTarget.arrowDown(event);
    } else if (event.key === "ArrowUp") {
      event.currentTarget.arrowUp(event);
    } else if (event.key === "PageDown") {
      event.currentTarget.pageDown(event);
    } else if (event.key === "PageUp") {
      event.currentTarget.pageUp(event);
    } else if (event.key === "Home") {
      event.currentTarget.home(event);
    } else if (event.key === "End") {
      event.currentTarget.end(event);
    }
  }

  arrowRight(event) {
    const currentCell = document.activeElement.closest("td");
    const isLastTd = currentCell.matches(`:last-of-type`);
    if (!isLastTd) {
      currentCell.nextElementSibling.querySelector(".ghwo-chiclet").focus();
    }
  }

  arrowLeft(event) {
    const currentCell = document.activeElement.closest("td");
    const isFirstTd = currentCell.matches(":first-of-type");
    if (!isFirstTd) {
      currentCell.previousElementSibling.querySelector(".ghwo-chiclet").focus();
    }
  }

  arrowUp(event) {
    const currentCell = document.activeElement.closest("td");
    const currentRow = currentCell.parentElement;
    const isFirstRow = currentRow.matches(`:first-of-type`);
    const elementIndex = Array.from(currentRow.children).findIndex((el) => {
      return el === currentCell;
    });
    if (!isFirstRow) {
      const prevCell = currentRow.previousElementSibling.querySelector(
        `td:nth-child(${elementIndex + 1})`,
      );
      const prevButton = prevCell.querySelector(".ghwo-chiclet");
      prevButton.focus();
      event.preventDefault();
    }
  }

  arrowDown(event) {
    const currentCell = document.activeElement.closest("td");
    const currentRow = currentCell.parentElement;
    const isLastRow = currentRow.matches(`:last-of-type`);
    const elementIndex = Array.from(currentRow.children).findIndex(
      (el) => el === currentCell,
    );
    if (!isLastRow) {
      const nextCell = currentRow.nextElementSibling.querySelector(
        `td:nth-child(${elementIndex + 1})`,
      );
      const nextButton = nextCell.querySelector(".ghwo-chiclet");
      nextButton.focus();
      event.preventDefault();
    }
  }

  pageDown(event) {
    const currentCell = document.activeElement.closest("td");
    const currentRow = currentCell.parentElement;
    const isLastRow = currentRow.matches(`:last-of-type`);
    const elementIndex = Array.from(currentRow.children).findIndex(
      (el) => el === currentCell,
    );
    if (!isLastRow) {
      const nextCell = currentRow.parentElement.querySelector(
        `tr:last-of-type > td:nth-of-type(${elementIndex + 1})`,
      );
      const nextButton = nextCell.querySelector(".ghwo-chiclet");
      nextButton.focus();
      event.preventDefault();
    }
  }

  pageUp(event) {
    const currentCell = document.activeElement.closest("td");
    const currentRow = currentCell.parentElement;
    const isFirstRow = currentRow.matches(`:first-of-type`);
    const elementIndex = Array.from(currentRow.children).findIndex((el) => {
      return el === currentCell;
    });
    if (!isFirstRow) {
      const prevCell = currentRow.parentElement.querySelector(
        `tr:first-of-type > td:nth-of-type(${elementIndex + 1})`,
      );
      const prevButton = prevCell.querySelector(".ghwo-chiclet");
      prevButton.focus();
      event.preventDefault();
    }
  }

  home(event) {
    const currentCell = document.activeElement.closest("td");
    const currentRow = currentCell.parentElement;
    const isFirstElement = currentCell.matches(":first-of-type");
    if (!isFirstElement) {
      let firstCell = currentRow.querySelector(
        "td:first-of-type  .ghwo-chiclet",
      );
      if (event.ctrlKey) {
        // If control is also pressed, we navigate to the first cell
        // in the first row
        const firstRow =
          currentRow.parentElement.querySelector(`tr:first-of-type`);
        firstCell = firstRow.querySelector(`td:first-of-type  .ghwo-chiclet`);
      }
      firstCell.focus();
      event.preventDefault();
    }
  }

  end(event) {
    const currentCell = document.activeElement.closest("td");
    const currentRow = currentCell.parentElement;
    const isLastElement = currentCell.matches(":last-of-type");
    if (!isLastElement) {
      let lastCell = currentRow.querySelector("td:last-of-type  .ghwo-chiclet");
      if (event.ctrlKey) {
        // If control is also pressed, we navigate to the last
        // cell in the last row
        const lastRow =
          currentRow.parentElement.querySelector(`tr:last-of-type`);
        lastCell = lastRow.querySelector("td:last-of-type  .ghwo-chiclet");
      }
      lastCell.focus();
      event.preventDefault();
    }
  }

  handleScroll(event) {
    if (event.target.scrollLeft > 0) {
      this.setAttribute("data-scrolled", "true");
    } else {
      this.setAttribute("data-scrolled", "false");
    }
  }
}

if (!window.customElements.get("wx-ghwo-details-table")) {
  window.customElements.define("wx-ghwo-details-table", GHWODetailsTable);
}

export default GHWODetailsTable;
