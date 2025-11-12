import { expect } from "chai";
import { createSandbox } from "sinon";

const TEST_MARKUP = `
<!-- Example includes two rows with some empty cells -->
<wx-ghwo-details-table target="wx-ghwo-table-details-pane">
    <table id="wx-ghwo-table">
        <tr>
            <td><div class="ghwo-chiclet chiclet-detail-cell chiclet-detail-cell-empty" data-risk-level="0" data-risk-factor="Rain" tabindex="0"></div></td>
            <td>
                <button class="ghwo-chiclet" role="button" data-risk-level="4" data-risk-factor="HighWinds" data-day-number="2" data-day-name="Tuesday" aria-selected="true">
                    4
                </button>
            </td>
            <td aria-selected="false">
                <button class="ghwo-chiclet" role="button" data-risk-level="2" data-risk-factor="HighWinds" data-day-number="3" data-day-name="Wednesday" aria-selected="false">
                    2
                </button>
            </td>
        </tr>
        <tr>
            <td>
                <div class="ghwo-chiclet chiclet-detail-cell chiclet-detail-cell-empty" data-risk-level="0" data-risk-factor="Rain" tabindex="0"></div>
            </td>
            <td>
                <div class="ghwo-chiclet chiclet-detail-cell chiclet-detail-cell-empty" data-risk-level="0" data-risk-factor="Rain" tabindex="0"></div>
            </td>
            <td>
                <button class="ghwo-chiclet" role="button" data-risk-level="3" data-risk-factor="Rain" data-day-number="3" data-day-name="Monday" aria-selected="false">
                    2
                </button>
            </td>
        </tr>
    </table>
    <div id="pane-container">
        <div class="ghwo-details-pane" aria-hidden="false" data-risk-factor="HighWinds" data-day-number="2"></div>
        <div class="ghwo-details-pane" aria-hidden="true" data-risk-factor="HighWinds" data-day-number="3"></div>
        <div class="ghwo-details-pane" aria-hidden="true" data-risk-factor="Rain" data-day-number="3"></div>
    </div>
</wx-ghwo-details-table> 
`;

describe("GHWO Daily Details Table component tests", () => {
  before(async () => {
    await import("../../assets/js/components/ghwo-details-table.js");
  });

  let sandbox;
  beforeEach(() => {
    sandbox = createSandbox();
    document.body.innerHTML = TEST_MARKUP;
    const component = document.querySelector("wx-ghwo-details-table");
    const selected = component.querySelector(`[aria-selected="true"]`);
    selected.focus();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("Has one and only one button selected by default", () => {
    const component = document.querySelector("wx-ghwo-details-table");
    const selected = Array.from(
      component.querySelectorAll(`td [aria-selected="true"]`),
    );

    expect(selected).to.have.length(1);
  });

  it("Clicking the last button in the table selects that button and de-selects the others", () => {
    const component = document.querySelector("wx-ghwo-details-table");
    const buttons = Array.from(
      component.querySelectorAll(`[role="button"].ghwo-chiclet`),
    );
    const thirdButton = buttons[2];

    // To start, we expect the third button is not selected
    expect(thirdButton.getAttribute("aria-selected")).to.not.equal("true");

    // Click the button
    thirdButton.click();

    // We expect all buttons that are not the clicked button to
    // have aria-select set to false
    buttons
      .filter((button) => {
        return button !== thirdButton;
      })
      .forEach((button) => {
        expect(button.getAttribute("aria-selected")).to.not.equal("true");
      });

    // And now the third button should be the selected one
    expect(thirdButton.getAttribute("aria-selected")).to.equal("true");
  });

  it("Clicking the last button in the table will display its corresponding pane and hide the other panes", async () => {
    const component = document.querySelector("wx-ghwo-details-table");
    const panes = Array.from(component.querySelectorAll(".ghwo-details-pane"));
    const thirdButton = component.querySelector(
      `tr:nth-child(2) td:last-child > [role="button"]`,
    );
    expect(thirdButton).to.exist;

    const thirdPane = panes[2];
    const otherPanes = panes.filter((pane) => pane !== thirdPane);
    expect(thirdPane.getAttribute("aria-hidden")).to.equal("true");

    // Click the third button. Then we expect the third pane
    // to be showing, and the others hidden.
    thirdButton.click();
    expect(thirdPane.getAttribute("aria-hidden")).to.equal("false");
    otherPanes.forEach((pane) => {
      expect(pane.getAttribute("aria-hidden")).to.equal("true");
    });
  });

  it("click handler will not be called if click comes from non-chiclet button", () => {
    const nonChicletButton = document.createElement("button");
    const component = document.querySelector("wx-ghwo-details-table");
    component.append(nonChicletButton);
    const clickHandlerSpy = sandbox.spy(component, "handleClick");

    nonChicletButton.click();
    expect(clickHandlerSpy.callCount).to.equal(0);
  });

  describe("Arrow key navigation tests", () => {
    it("Navigates one cell to the left", () => {
      /**
       * From
       * O X O
       * O O O
       *
       * To
       * X O O
       * O O O
       */
      const event = new window.KeyboardEvent("keydown", {
        bubbles: true,
        key: "ArrowLeft",
      });
      const component = document.querySelector("wx-ghwo-details-table");
      const expectedFocusEl =
        document.activeElement.parentElement.previousElementSibling.querySelector(
          ".ghwo-chiclet",
        );

      component.dispatchEvent(event);

      const actualFocusEl = document.activeElement;

      expect(actualFocusEl).to.eql(expectedFocusEl);
    });

    it("Doesn't navigate another cell to the left, because we are at the beginning of the row", () => {
      const event = new window.KeyboardEvent("keydown", {
        bubbles: true,
        key: "ArrowLeft",
      });
      const component = document.querySelector("wx-ghwo-details-table");

      // Focus the first chiclet in the first row
      const firstCell = component.querySelector(
        `tr:first-of-type > td:first-of-type > .ghwo-chiclet`,
      );
      firstCell.focus();
      expect(firstCell.matches(`:focus`)).to.equal(true);

      component.dispatchEvent(event);

      const actualFocusEl = document.activeElement;

      // We expect the focus to not have changed
      expect(actualFocusEl).to.eql(firstCell);
    });

    /**
     * From
     * O X O
     * O O O
     *
     * To
     * O O X
     * O O O
     */
    it("Navigates one cell to the right", () => {
      const event = new window.KeyboardEvent("keydown", {
        bubbles: true,
        key: "ArrowRight",
      });
      const component = document.querySelector("wx-ghwo-details-table");
      const currentFocusEl = document.activeElement;
      const expectedFocusEl =
        currentFocusEl.parentElement.nextElementSibling.querySelector(
          ".ghwo-chiclet",
        );

      component.dispatchEvent(event);

      const actualFocusEl = document.activeElement;

      expect(actualFocusEl).to.eql(expectedFocusEl);
    });

    it("Doesn't navigate to another cell to the right, because we are at the end of the row", () => {
      const event = new window.KeyboardEvent("keydown", {
        bubbles: true,
        key: "ArrowRight",
      });
      const component = document.querySelector("wx-ghwo-details-table");

      // Focus the last chiclet in the first row
      const lastCell = component.querySelector(
        `tr:first-of-type > td:last-of-type > .ghwo-chiclet`,
      );
      lastCell.focus();
      expect(lastCell.matches(`:focus`)).to.equal(true);

      component.dispatchEvent(event);

      expect(document.activeElement).to.eql(lastCell);
    });

    /**
     * From
     * O X O
     * O O O
     *
     * To
     * O O O
     * O X O
     */
    it("Navigates down to the cell below the current cell", () => {
      const event = new window.KeyboardEvent("keydown", {
        bubbles: true,
        key: "ArrowDown",
      });
      const component = document.querySelector("wx-ghwo-details-table");

      // Select the second chiclet in the first row
      const secondCell = component.querySelector(
        `tr:first-of-type > td:nth-of-type(2) > .ghwo-chiclet`,
      );
      secondCell.focus();
      expect(secondCell.matches(`:focus`)).to.equal(true);

      // We expect to focus the second chiclet in the second row
      // which is the one right below the current focussed element
      const expectedCell = component.querySelector(
        `tr:nth-of-type(2) > td:nth-of-type(2) > .ghwo-chiclet`,
      );

      component.dispatchEvent(event);

      expect(document.activeElement).to.eql(expectedCell);
    });

    it("Does not navigate down when we are already in the bottom row", () => {
      const event = new window.KeyboardEvent("keydown", {
        bubbles: true,
        key: "ArrowDown",
      });
      const component = document.querySelector("wx-ghwo-details-table");

      // Select the second chiclet in the last row
      const secondCell = component.querySelector(
        `tr:last-of-type > td:nth-of-type(2) > .ghwo-chiclet`,
      );
      secondCell.focus();
      expect(secondCell.matches(`:focus`)).to.equal(true);

      // We expect the same cell  to still have focus (nothing happens)
      // because we are already in the bottom row
      component.dispatchEvent(event);
      expect(document.activeElement).to.eql(secondCell);
    });

    /**
     * From
     * O O O
     * O X O
     *
     * To
     * O X O
     * O O O
     */
    it("Navigates up to the cell above the current cell", () => {
      const event = new window.KeyboardEvent("keydown", {
        bubbles: true,
        key: "ArrowUp",
      });
      const component = document.querySelector("wx-ghwo-details-table");

      // Select the second cell in the last row
      const secondCell = component.querySelector(
        `tr:last-of-type > td:nth-of-type(2) > .ghwo-chiclet`,
      );
      secondCell.focus();
      expect(secondCell.matches(`:focus`)).to.equal(true);

      // We expect the second cell of the first row to be selected
      // after the event
      const expectedCell = component.querySelector(
        `tr:first-of-type > td:nth-of-type(2) > .ghwo-chiclet`,
      );
      component.dispatchEvent(event);

      expect(document.activeElement).to.eql(expectedCell);
    });

    it("Does not navigate up when we are already in the top row", () => {
      const event = new window.KeyboardEvent("keydown", {
        bubbles: true,
        key: "ArrowUp",
      });
      const component = document.querySelector("wx-ghwo-details-table");

      // Select the second chiclet in the last row
      const secondCell = component.querySelector(
        `tr:first-of-type > td:nth-of-type(2) > .ghwo-chiclet`,
      );
      secondCell.focus();
      expect(secondCell.matches(`:focus`)).to.equal(true);

      // We expect the same cell  to still have focus (nothing happens)
      // because we are already in the top row
      component.dispatchEvent(event);
      expect(document.activeElement).to.eql(secondCell);
    });
  });

  describe("Page key tests", () => {
    it("PageDown navigates to the bottom row at the same cell index", () => {
      const event = new window.KeyboardEvent("keydown", {
        bubbles: true,
        key: "PageDown",
      });
      const component = document.querySelector("wx-ghwo-details-table");

      // Start by selecting the second item in the top row
      const secondCell = component.querySelector(
        `tr:first-of-type > td:nth-of-type(2) > .ghwo-chiclet`,
      );
      secondCell.focus();
      expect(secondCell.matches(`:focus`)).to.equal(true);

      // We expect the second row at the second cell index to be
      // focussed
      const expectedCell = component.querySelector(
        `tr:nth-of-type(2) > td:nth-of-type(2) > .ghwo-chiclet`,
      );
      component.dispatchEvent(event);

      expect(document.activeElement).to.eql(expectedCell);
    });

    it("PageDown doesn't navigate if we are already in the bottom row", () => {
      const event = new window.KeyboardEvent("keydown", {
        bubbles: true,
        key: "PageDown",
      });
      const component = document.querySelector("wx-ghwo-details-table");

      // Start by selecting the second item in the bottom row
      const secondCell = component.querySelector(
        `tr:last-of-type > td:nth-of-type(2) > .ghwo-chiclet`,
      );
      secondCell.focus();
      expect(secondCell.matches(`:focus`)).to.equal(true);

      // We expect the focus to not have changed
      component.dispatchEvent(event);
      expect(document.activeElement).to.eql(secondCell);
    });

    it("PageUp navigates to the top row at the same cell index", () => {
      const event = new window.KeyboardEvent("keydown", {
        bubbles: true,
        key: "PageUp",
      });
      const component = document.querySelector("wx-ghwo-details-table");

      // Start by selecting the second item in the bottom row
      const secondCell = component.querySelector(
        `tr:last-of-type > td:nth-of-type(2) > .ghwo-chiclet`,
      );
      secondCell.focus();
      expect(secondCell.matches(`:focus`)).to.equal(true);

      // We expect the second row at the second cell index to be
      // focussed
      const expectedCell = component.querySelector(
        `tr:first-of-type > td:nth-of-type(2) > .ghwo-chiclet`,
      );
      component.dispatchEvent(event);

      expect(document.activeElement).to.eql(expectedCell);
    });

    it("PageUp doesn't navigate if we are already in the top row", () => {
      const event = new window.KeyboardEvent("keydown", {
        bubbles: true,
        key: "PageUp",
      });
      const component = document.querySelector("wx-ghwo-details-table");

      // Start by selecting the second item in the top row
      const secondCell = component.querySelector(
        `tr:first-of-type > td:nth-of-type(2) > .ghwo-chiclet`,
      );
      secondCell.focus();
      expect(secondCell.matches(`:focus`)).to.equal(true);

      // We expect the focus to not have changed
      component.dispatchEvent(event);
      expect(document.activeElement).to.eql(secondCell);
    });
  });

  describe("Home key navigation", () => {
    /**
     * From
     * O O X
     * O O O
     *
     * To
     * X O O
     * O O O
     */
    it("Home moves focus to the first cell in the current row", () => {
      const event = new window.KeyboardEvent("keydown", {
        bubbles: true,
        key: "Home",
      });
      const component = document.querySelector("wx-ghwo-details-table");

      // Select the last item in the first row to start
      const lastCell = component.querySelector(
        `tr:first-of-type > td:last-of-type > .ghwo-chiclet`,
      );
      lastCell.focus();
      expect(lastCell.matches(`:focus`)).to.equal(true);

      // We expect the first cell in the row to get the focus
      const expectedCell = component.querySelector(
        `tr:first-of-type > td:first-of-type > .ghwo-chiclet`,
      );
      component.dispatchEvent(event);

      expect(document.activeElement).to.eql(expectedCell);
    });

    it("Home does not change focus when first cell in the row already has it", () => {
      const event = new window.KeyboardEvent("keydown", {
        bubbles: true,
        key: "Home",
      });
      const component = document.querySelector("wx-ghwo-details-table");

      // Start at the first cell in the first row
      const firstCell = component.querySelector(
        `tr:first-of-type > td:first-of-type > .ghwo-chiclet`,
      );
      firstCell.focus();
      expect(firstCell.matches(":focus")).to.equal(true);

      // We expect the focus to not change
      component.dispatchEvent(event);

      expect(document.activeElement).to.eql(firstCell);
    });

    /**
     * From
     * O O O
     * O O X
     *
     * To
     * X O O
     * O O O
     */
    it("Home navigates to the first cell in the first row when pressed with control", () => {
      const event = new window.KeyboardEvent("keydown", {
        bubbles: true,
        key: "Home",
        ctrlKey: true,
      });
      const component = document.querySelector("wx-ghwo-details-table");

      // Start by selecting the last cell in the last row
      const lastCell = component.querySelector(
        `tr:last-of-type > td:last-of-type > .ghwo-chiclet`,
      );
      lastCell.focus();
      expect(lastCell.matches(`:focus`)).to.equal(true);

      // We expect the first cell in the _first_ row to get
      // the focus
      const expectedCell = component.querySelector(
        `tr:first-of-type > td:first-of-type > .ghwo-chiclet`,
      );
      component.dispatchEvent(event);

      expect(document.activeElement).to.eql(expectedCell);
    });
  });

  describe("End key navigation", () => {
    /**
     * From
     * X O O
     * O O O
     *
     * To
     * O O X
     * O O O
     */
    it("End navigates to the last cell in the current row", () => {
      const event = new window.KeyboardEvent("keydown", {
        bubbles: true,
        key: "End",
      });
      const component = document.querySelector("wx-ghwo-details-table");

      // Start by selecting the first item in the last row
      const firstCell = component.querySelector(
        `tr:last-of-type > td:first-of-type > .ghwo-chiclet`,
      );
      firstCell.focus();
      expect(firstCell.matches(":focus")).to.equal(true);

      // We expect the first cell of the last row to get the
      // focus
      const expectedCell = component.querySelector(
        `tr:last-of-type > td:last-of-type > .ghwo-chiclet`,
      );
      component.dispatchEvent(event);

      expect(document.activeElement).to.eql(expectedCell);
    });

    it("End does not change focus when the last cell in the row already has it", () => {
      const event = new window.KeyboardEvent("keydown", {
        bubbles: true,
        key: "End",
      });
      const component = document.querySelector("wx-ghwo-details-table");

      // Start at the first cell of the first row
      const lastCell = component.querySelector(
        `tr:first-of-type > td:last-of-type > .ghwo-chiclet`,
      );
      lastCell.focus();
      expect(lastCell.matches(`:focus`)).to.equal(true);

      // We expect the focus doesn't change at all
      component.dispatchEvent(event);

      expect(document.activeElement).to.eql(lastCell);
    });

    it("End navigates to the last cell in the last row when pressed with control", () => {
      const event = new window.KeyboardEvent("keydown", {
        bubbles: true,
        key: "End",
        ctrlKey: true,
      });
      const component = document.querySelector("wx-ghwo-details-table");

      // Select the first cell in the first row
      const firstCell = component.querySelector(
        `tr:first-of-type > td:first-of-type > .ghwo-chiclet`,
      );
      firstCell.focus();
      expect(firstCell.matches(`:focus`)).to.equal(true);

      // We expect the last cell of the last row to
      // get the focus
      const expectedCell = component.querySelector(
        `tr:last-of-type > td:last-of-type > .ghwo-chiclet`,
      );
      component.dispatchEvent(event);

      expect(document.activeElement).to.eql(expectedCell);
    });
  });
});
