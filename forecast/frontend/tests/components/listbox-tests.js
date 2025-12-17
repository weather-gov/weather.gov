import { expect } from "chai";
import { before, beforeEach } from "mocha";
import { createSandbox } from "sinon";

const exampleMarkup = `
<wx-listbox tabindex="0" id="listbox">
  <li role="option" id="first">First option</li>
  <li role="option" id="second">Second option</li>
  <li role="option" id="third">Third option</li>
  <li role="option" id="fourth">Fourth option</li>
  <li role="option" id="fifth">Fifth option</li>
</wx-listbox>
`;

const wait = (milliseconds) => {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
};

describe("Listbox component tests", () => {
  before(async () => {
    await import("../../assets/js/components/combobox/listbox.js");
  });

  beforeEach(async () => {
    document.body.innerHTML = exampleMarkup;

    // Wait for slotchange events to resolve
    await wait(50);
  });

  it("Automatically adds [role='option'] to direct slotted child elements", () => {
    const listbox = document.getElementById("listbox");
    Array.from(listbox.children).forEach(child => {
      expect(child.getAttribute("role")).to.equal("option");
    });
  });

  it("Focusing the listbox itself will pseudo-focus the first item, if nothing is currently selected", () => {
    const listbox = document.getElementById("listbox");
    const selection = listbox.selection;
    expect(selection).to.be.null;

    listbox.focus();
    const firstItem = listbox.querySelector(`[role="option"]:first-of-type`);
    expect(listbox.pseudoFocus).to.eql(firstItem);
  });

  it("Focus on the listbox itself will pseudo-focus the currently selected item, if there is a selection", () => {
    const listbox = document.getElementById("listbox");
    const thirdItem = listbox.querySelector(`[role="option"]:nth-of-type(3)`);
    expect(thirdItem).to.exist;
    expect(listbox.pseudoFocus).to.not.eql(thirdItem);
    
    listbox.selectItem(thirdItem);
    listbox.focus();

    expect(listbox.pseudoFocus).to.eql(thirdItem);
  });

  it("clicking an item will select it", async () => {
    const listbox = document.getElementById("listbox");
    const thirdItem = listbox.querySelector(`[role="option"]:nth-of-type(3)`);
    expect(listbox.selection).to.not.eql(thirdItem);

    thirdItem.click();
    await wait(5);

    expect(listbox.selection).to.eql(thirdItem);
  });

  describe("Method tests", () => {
    let sandbox;
    beforeEach(() => {
      sandbox = createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });
    
    describe("#handleFocus", () => {
      it("will pseudo-focus the first item if there is no current selection", async () => {
        const listbox = document.getElementById("listbox");
        const firstItem = listbox.querySelector(`[role="option"]:first-of-type`);
        expect(listbox.matches(":focus")).to.be.false;
        expect(listbox.selection).to.be.null;
        expect(listbox.pseudoFocus).to.not.eql(firstItem);

        listbox.focus();
        await wait(5);

        expect(listbox.selection).to.be.null;
        expect(listbox.pseudoFocus).to.eql(firstItem);
      });

      it("will pseudo-focus the selected item if there is one", async () => {
        const listbox = document.getElementById("listbox");
        const secondItem = listbox.querySelector(`[role="option"]:nth-of-type(2)`);
        expect(listbox.selection).to.be.null;

        listbox.selectItem(secondItem);
        listbox.focus();
        await wait(5);

        expect(listbox.selection).to.eql(secondItem);
        expect(listbox.pseudoFocus).to.eql(secondItem);
      });
    });

    describe("#handleClick", () => {
      it("will select an option if the option element is clicked", async () => {
        const listbox = document.getElementById("listbox");
        const secondItem = listbox.querySelector(`[role="option"]:nth-of-type(2)`);
        expect(listbox.selection).to.be.null;

        secondItem.click();
        await wait(5);

        expect(listbox.selection).to.eql(secondItem);
      });

      it("will select an option if an option element's child is the element that is clicked", async () => {
        const listbox = document.getElementById("listbox");
        const secondItem = listbox.querySelector(`[role="option"]:nth-of-type(2)`);
        expect(listbox.selection).to.not.eql(secondItem);
        const innerEl = document.createElement("div");
        secondItem.append(innerEl);

        innerEl.click();
        await wait(5);

        expect(listbox.selection).to.eql(secondItem);
      });

      it("will not make any selections if something outside of an option element hierarchy is clicked", async () => {
        const listbox = document.getElementById("listbox");
        expect(listbox.selection).to.be.null;

        listbox.click();
        await wait(5);

        expect(listbox.selection).to.be.null;
      });
    });

    describe("#handleKeyDown", () => {
      it("calls the expected handlers for each key in the mapping", async () => {
        const listbox = document.getElementById("listbox");
        Object.keys(listbox.keyMapping).forEach(async (key) => {
          const handler = listbox.keyMapping[key];
          const spy = sandbox.spy(handler);

          listbox.dispatchEvent(
            new window.KeyboardEvent("keydown", {
              key: key,
              bubbles: true
            })
          );
          await wait(5);

          expect(spy.callCount).to.equal(1);
        });
      });
    });

    describe("#handleItemsChanged", () => {
      it("sets the data-option-index attribute for the assigned slotted elements", async () => {
        const listbox = document.getElementById("listbox");
        const fakeElements = Array.from(listbox.querySelectorAll(`[role="option"]`));
        const slot = listbox.shadowRoot.querySelector("slot");
        expect(slot).to.exist;
        const mockAssignedElements = sandbox.stub(slot, "assignedElements");
        mockAssignedElements.returns(fakeElements);

        slot.dispatchEvent(
          new Event("slotchange")
        );
        await wait(5);

        fakeElements.forEach((fakeEl, idx) => {
          expect(fakeEl.getAttribute("data-option-index")).to.equal(idx.toString(), fakeEl.outerHTML);
        });
      });
    });

    describe("#pseudoFocusItem", () => {
      it("sets the data-pseudo-focus attribute", () => {
        const listbox = document.getElementById("listbox");
        const secondItem = listbox.querySelector(`[role="option"]:nth-of-type(2)`);
        expect(secondItem.hasAttribute("data-pseudo-focus")).to.be.false;

        listbox.pseudoFocusItem(secondItem);

        expect(secondItem.getAttribute("data-pseudo-focus")).to.equal("true");
      });

      it("removes the data-pseudo-focus attribute from the non-focused elements", () => {
        const listbox = document.getElementById("listbox");
        const firstItem = listbox.querySelector(`[role="option"]:first-of-type`);
        const otherItems = Array.from(
          listbox.querySelectorAll(`[role="option"]:not(:first-of-type)`)
        );
        Array.from(
          listbox.querySelectorAll(`[role="option"]`)
        ).forEach(optionEl => {
          optionEl.setAttribute("data-pseudo-focus", true);
        });

        listbox.pseudoFocusItem(firstItem);
        expect(firstItem.hasAttribute("data-pseudo-focus"));
        otherItems.forEach(otherEl => {
          expect(otherEl.hasAttribute("data-pseudo-focus")).to.be.false;
        });
      });

      it("calls #selectItem if the selection-follows-focus attribute is set", () => {
        const listbox = document.getElementById("listbox");
        listbox.setAttribute("selection-follows-focus", "true");
        const spy = sandbox.spy(listbox, "selectItem");
        const secondItem = listbox.querySelector(`[role="option"]`);
        expect(secondItem.hasAttribute("data-pseudo-focus")).to.be.false;

        listbox.pseudoFocusItem(secondItem);

        expect(spy.callCount).to.equal(1);
      });

      it("removes all pseudo-focus from the component if called with falsy value", () => {
        const listbox = document.getElementById("listbox");
        const secondItem = listbox.querySelector(`[role="option"]:nth-of-type(2)`);
        secondItem.setAttribute("data-pseudo-focus", true);
        expect(listbox.pseudoFocus).to.eql(secondItem);

        listbox.pseudoFocusItem(null);

        const focusedItems = listbox.querySelectorAll(`[data-pseudo-focus="true"]`);
        expect(focusedItems.length).to.equal(0);
      });
    });

    describe("#selectPseudoFocused", () => {
      it("calls #selectItem if there is a pseudo-focus element", () => {
        const listbox = document.getElementById("listbox");
        const spy = sandbox.spy(listbox, "selectItem");
        const secondItem = listbox.querySelector(`[role="option"]:nth-of-type(2)`);
        secondItem.setAttribute("data-pseudo-focus", true);

        listbox.selectPseudoFocused();

        expect(spy.callCount).to.equal(1);
      });

      it("does not call #selectItem if there is no pseudo-focused element currently", () => {
        const listbox = document.getElementById("listbox");
        expect(listbox.pseudoFocus).to.be.null;
        const spy = sandbox.spy(listbox, "selectItem");

        listbox.selectPseudoFocused();

        expect(spy.callCount).to.equal(0);
      });
    });

    describe("#selectItem", () => {
      it("sets aria-selected on the given element", () => {
        const listbox = document.getElementById("listbox");
        const secondItem = listbox.querySelector(`[role="option"]`);
        expect(secondItem.hasAttribute("aria-selected")).to.be.false;

        listbox.selectItem(secondItem);

        expect(secondItem.getAttribute("aria-selected")).to.equal("true");
      });

      it("removes aria-selected for any currently selected elements", () => {
        const listbox = document.getElementById("listbox");
        const firstItem = listbox.querySelector(`[role="option"]:first-of-type`);
        const secondItem = listbox.querySelector(`[role="option"]:nth-of-type(2)`);
        firstItem.setAttribute("aria-selected", true);

        listbox.selectItem(secondItem);

        expect(firstItem.hasAttribute("aria-selected")).to.be.false;
      });

      it("removes aria-selected from any currently selected items when the incoming value is falsy", () => {
        const listbox = document.getElementById("listbox");
        const firstItem = listbox.querySelector(`[role="option"]:first-of-type`);
        firstItem.setAttribute("aria-selected", "true");

        listbox.selectItem(false);

        expect(firstItem.hasAttribute("aria-selected")).to.be.false;
        expect(listbox.selection).to.not.exist;
      });

      it("triggers a change event", () => {
        const listbox = document.getElementById("listbox");
        const secondItem = listbox.querySelector(`[role="option"]:nth-of-type(2)`);
        const spy = sandbox.spy(listbox, "dispatchEvent");

        listbox.selectItem(secondItem);

        expect(spy.callCount).to.equal(1);
        const dispatchCall = spy.getCall(0);
        const event = dispatchCall.args[0];

        expect(event.type).to.equal("change");
      });
    });

    describe("#moveUp", () => {
      it("dispatches the wx:popup-nav custom event if there is a previous selection", () => {
        const listbox = document.getElementById("listbox");
        const firstItem = listbox.querySelector(`[role="option"]:first-of-type`);
        const secondItem = listbox.querySelector(`[role="option"]:nth-of-type(2)`);
        listbox.pseudoFocusItem(secondItem);
        const dispatchSpy = sandbox.spy(listbox, "dispatchEvent");
        
        listbox.moveUp();

        expect(dispatchSpy.callCount).to.equal(1);
        const dispatchCall = dispatchSpy.getCall(0);
        const event = dispatchCall.args[0];
        expect(event.type).to.equal("wx:popup-nav");
        expect(event.detail.previous).to.eql(secondItem);
        expect(event.detail.next).to.eql(firstItem);
        expect(event.constructor).to.eql(window.CustomEvent);
      });

      it("doesn't dispatch the wx:popup-nav event if we are already at the top of the list", () => {
        const listbox = document.getElementById("listbox");
        const dispatchSpy = sandbox.spy(listbox, "dispatchEvent");

        listbox.moveUp();

        expect(dispatchSpy.callCount).to.equal(0);
      });
    });

    describe("#moveDown", () => {
      it("dispatches the wx:popup-nav custom event if there is a next selection", () => {
        const listbox = document.getElementById("listbox");
        const lastItem = listbox.querySelector(`[role="option"]:last-of-type`);
        const penultimateItem = listbox.querySelector(`[role="option"]:nth-of-type(4)`);
        listbox.pseudoFocusItem(penultimateItem);
        const dispatchSpy = sandbox.spy(listbox, "dispatchEvent");

        listbox.moveDown();

        expect(dispatchSpy.callCount).to.equal(1);

        const dispatchCall = dispatchSpy.getCall(0);
        const event = dispatchCall.args[0];

        expect(event.type).to.equal("wx:popup-nav");
        expect(event.detail.previous).to.eql(penultimateItem);
        expect(event.detail.next).to.eql(lastItem);
        expect(event.constructor).to.eql(window.CustomEvent);
      });

      it("doesn't dispatch the wx:popup-nav event if we are already at the bottom of the list", () => {
        const listbox = document.getElementById("listbox");
        const lastItem = listbox.querySelector(`[role="option"]:last-of-type`);
        listbox.pseudoFocusItem(lastItem);
        const dispatchSpy = sandbox.spy(listbox, "dispatchEvent");

        listbox.moveDown();

        expect(dispatchSpy.callCount).to.equal(0);
      });
    });

    describe("#moveHome", () => {
      it("dispatches the wx:popup-nav custom event if we are not already at the top of the list", () => {
        const listbox = document.getElementById("listbox");
        const firstItem = listbox.querySelector(`[role="option"]:first-of-type`);
        const thirdItem = listbox.querySelector(`[role="option"]:nth-of-type(3)`);
        listbox.pseudoFocusItem(thirdItem);
        const dispatchSpy = sandbox.spy(listbox, "dispatchEvent");

        listbox.moveHome();

        expect(dispatchSpy.callCount).to.equal(1);

        const dispatchCall = dispatchSpy.getCall(0);
        const event = dispatchCall.args[0];

        expect(event.type).to.equal("wx:popup-nav");
        expect(event.detail.previous).to.eql(thirdItem);
        expect(event.detail.next).to.eql(firstItem);
        expect(event.constructor).to.eql(window.CustomEvent);
      });

      it("doesn't dispatch the wx:popup-nav event if we are already at the top of the list", () => {
        const listbox = document.getElementById("listbox");
        const firstItem = listbox.querySelector(`[role="option"]`);
        listbox.pseudoFocusItem(firstItem);
        const dispatchSpy = sandbox.spy(listbox, "dispatchEvent");

        listbox.moveHome();

        expect(dispatchSpy.callCount).to.equal(0);
      });
    });

    describe("#moveEnd", () => {
      it("dispatches thie wx:popup-nav custom event if we are not already at the bottom of the list", () => {
        const listbox = document.getElementById("listbox");
        const secondItem = listbox.querySelector(`[role="option"]:nth-of-type(2)`);
        const lastItem = listbox.querySelector(`[role="option"]:last-of-type`);
        listbox.pseudoFocusItem(secondItem);
        const dispatchSpy = sandbox.spy(listbox, "dispatchEvent");

        listbox.moveEnd();

        expect(dispatchSpy.callCount).to.equal(1);

        const dispatchCall = dispatchSpy.getCall(0);
        const event = dispatchCall.args[0];

        expect(event.type).to.equal("wx:popup-nav");
        expect(event.detail.previous).to.eql(secondItem);
        expect(event.detail.next).to.eql(lastItem);
        expect(event.constructor).to.eql(window.CustomEvent);
      });

      it("doesn't dispatch the wx:popup-nav event if we are already at the bottom of the list", () => {
        const listbox = document.getElementById("listbox");
        const lastItem = listbox.querySelector(`[role="option"]:last-of-type`);
        listbox.pseudoFocusItem(lastItem);
        const dispatchSpy = sandbox.spy(listbox, "dispatchEvent");

        listbox.moveEnd();

        expect(dispatchSpy.callCount).to.equal(0);
      });
    });
  });

  describe("Keyboard arrow navigation", () => {
    beforeEach(() => {
      const listbox = document.getElementById("listbox");
      listbox.focus();
    });

    afterEach(() => {
      const listbox = document.getElementById("listbox");
      listbox.removeAttribute("selection-follows-focus");
    });

    it("pseudo-focuses the second item in the list when down key is pressed", async () => {
      const listbox = document.getElementById("listbox");
      listbox.focus();
      const secondItem = listbox.querySelector(`[role="option"]:nth-of-type(2)`);
      expect(listbox.pseudoFocus).to.not.eql(secondItem);

      listbox.dispatchEvent(
        new window.KeyboardEvent("keydown", {
          key: "ArrowDown",
          bubbles: true,
          cancelable: true
        })
      );
      await wait(5);

      expect(listbox.pseudoFocus).to.eql(secondItem);
      expect(listbox.selection).to.not.eql(secondItem);
    });

    it("selects the second item in the list when the down key is pressed and selection follows focus is set via attribute", async () => {
      const listbox = document.getElementById("listbox");
      listbox.setAttribute("selection-follows-focus", true);
      const firstItem = listbox.querySelector(`[role="option"]:first-of-type`);
      const secondItem = listbox.querySelector(`[role="option"]:nth-of-type(2)`);
      listbox.pseudoFocusItem(firstItem);
      expect(listbox.selection).to.not.eql(secondItem);

      listbox.dispatchEvent(
        new window.KeyboardEvent("keydown", {
          key: "ArrowDown",
          bubbles: true
        })
      );
      await wait(5);

      expect(listbox.selection).to.eql(secondItem);
    });

    it("doesn't do anything if pseudo-focus is already at the end of the list", async () => {
      const listbox = document.getElementById("listbox");
      const lastItem = listbox.querySelector(`[role="option"]:last-of-type`);
      listbox.pseudoFocusItem(lastItem);

      listbox.dispatchEvent(
        new window.KeyboardEvent("keydown", {
          key: "ArrowDown",
          bubbles: true
        })
      );
      await wait(5);

      expect(listbox.pseudoFocus).to.eql(lastItem);
    });

    it("pseudo-focuses the second to last item in the list when up key is pressed", async () => {
      const listbox = document.getElementById("listbox");
      const lastItem = listbox.querySelector(`[role="option"]:last-of-type`);
      listbox.pseudoFocusItem(lastItem);
      const secondToLastItem = listbox.querySelector(`[role="option"]:nth-of-type(4)`);
      expect(listbox.pseudoFocus).to.not.eql(secondToLastItem);

      listbox.dispatchEvent(
        new window.KeyboardEvent("keydown", {
          key: "ArrowUp",
          bubbles: true
        })
      );
      await wait(5);

      expect(listbox.pseudoFocus).to.eql(secondToLastItem);
    });

    it("selects the fourth item in the list when the up key is pressed and selection follows focus is set via attribute", async () => {
      const listbox = document.getElementById("listbox");
      listbox.setAttribute("selection-follows-focus", true);
      const lastItem = listbox.querySelector(`[role="option"]:last-of-type`);
      listbox.pseudoFocusItem(lastItem);
      const secondToLastItem = listbox.querySelector(`[role="option"]:nth-of-type(4)`);
      expect(listbox.pseudoFocus).to.not.eql(secondToLastItem);

      listbox.dispatchEvent(
        new window.KeyboardEvent("keydown", {
          key: "ArrowUp",
          bubbles: true
        })
      );
      await wait(5);

      expect(listbox.selection).to.eql(secondToLastItem);
    });
  });

  describe("Keyboard Home/End/Enter navigation", () => {
    beforeEach(() => {
      const listbox = document.getElementById("listbox");
      listbox.focus();
      // Select the middle (third) item in the list
      const thirdItem = listbox.querySelector(`[role="option"]:nth-of-type(3)`);
      listbox.pseudoFocusItem(thirdItem);
    });

    afterEach(() => {
      const listbox = document.getElementById("listbox");
      listbox.removeAttribute("selection-follows-focus");
    });

    it("pseudo-focuses the first item in the list when the Home key is pressed", async () => {
      const listbox = document.getElementById("listbox");
      const firstItem = listbox.querySelector(`[role="option"]:first-of-type`);
      expect(listbox.pseudoFocus).to.not.eql(firstItem);

      listbox.dispatchEvent(
        new window.KeyboardEvent("keydown", {
          key: "Home",
          bubbles: true
        })
      );
      await wait(5);

      expect(listbox.pseudoFocus).to.eql(firstItem);
    });

    it("selects the first item in the list when the Home key is pressed and selection follows focus is set via attribute", async () => {
      const listbox = document.getElementById("listbox");
      listbox.setAttribute("selection-follows-focus", true);
      const firstItem = listbox.querySelector(`[role="option"]:first-of-type`);
      expect(listbox.selection).to.be.null;

      listbox.dispatchEvent(
        new window.KeyboardEvent("keydown", {
          key: "Home",
          bubbles: true
        })
      );
      await wait(5);

      expect(listbox.selection).to.eql(firstItem);
    });

    it("pseudo-focuses the last item in the list when the End key is pressed", async () => {
      const listbox = document.getElementById("listbox");
      const lastItem = listbox.querySelector(`[role="option"]:last-of-type`);
      expect(listbox.pseudoFocus).to.not.eql(lastItem);

      listbox.dispatchEvent(
        new window.KeyboardEvent("keydown", {
          key: "End",
          bubbles: true
        })
      );
      await wait(5);

      expect(listbox.pseudoFocus).to.eql(lastItem);
    });

    it("selects the last item in the list when the End key is pressed and selection follows focus is set via attribute", async () => {
      const listbox = document.getElementById("listbox");
      listbox.setAttribute("selection-follows-focus", true);
      const lastItem = listbox.querySelector(`[role="option"]:last-of-type`);
      expect(listbox.selection).to.be.null;

      listbox.dispatchEvent(
        new window.KeyboardEvent("keydown", {
          key: "End",
          bubbles: true
        })
      );
      await wait(5);

      expect(listbox.selection).to.eql(lastItem);
    });

    it("Enter key will select the currently pseudo-focused item", async () => {
      const listbox = document.getElementById("listbox");
      const secondItem = listbox.querySelector(`[role="option"]:nth-of-type(2)`);
      expect(listbox.pseudoFocus).to.not.eql(secondItem);
      expect(listbox.selection).to.not.eql(secondItem);

      listbox.pseudoFocusItem(secondItem);
      listbox.dispatchEvent(
        new window.KeyboardEvent("keydown", {
          key: "Enter",
          bubbles: true
        })
      );
      await wait(5);

      expect(listbox.selection).to.eql(secondItem);
    });
  });
});
