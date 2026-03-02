import { expect } from "chai";
import { before, beforeEach, afterEach } from "mocha";
import { createSandbox, spy } from "sinon";

const baseMarkup = `
<!doctype html>
<html>
    <head></head>
    <body>
        <wx-combobox tabindex="0" id="combobox">
            <input type="text" slot="input" role="combobox"/>
            <button type="button" slot="clear-button"></button>
            <button type="button" slot="toggle-button"></button>
            <wx-filterable-listbox slot="popup" id="listbox" role="listbox">
                <div>Permanent Area</div>
                <div role="group" id="listbox-permagroup" data-filter-ignore="true">
                    <div role="option" value="permaOne">Permanent Option 1</div>
                    <div role="option" value="permaTwo">Permanent Option 2</div>
                </div>
                <div>Filtered Options Area</div>
                <div role="group" id="listbox-filtered-options">
                    <div role="option" value="option1">First option</div>
                    <div role="option" value="option2">Second option</div>
                    <div role="option" value="option3">Third option</div>
                    <div role="option" value="option4">Fourth option</div>
                    <div role="option" value="option5">Fifth option</div>
                </div>
            </wx-filterable-listbox>
        </wx-combobox>
    </body>
</html>
`;

const wait = (milliseconds) => {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
};

describe("Combobox component tests", () => {
  before(async() => {
    await import("../../assets/js/components/combobox/filterable-listbox.js");
    await import("../../assets/js/components/combobox/combobox.js");
  });

  /**
   * WCAG Functionality Tests
   * ----------------------------------------------
   * This group of tests covers the interactive functionality that
   * is expected based on the WCAG combobox pattern
   * guidelines.
   * See (https://www.w3.org/WAI/ARIA/apg/patterns/combobox/#keyboardinteraction)
   */
  describe("WCAG Functionality Tests", () => {
    beforeEach(async() => {
      document.body.innerHTML = baseMarkup;

      // Let the slotchange and other init events
      // resolve
      await wait(50);
    });

    describe("Down Arrow", () => {
      it("if popup is available, moves focus [ie pseudo/visual focus] into the popup", async () => {
        const combobox = document.getElementById("combobox");
        combobox.input.focus();
        expect(combobox.popup.pseudoFocus).to.not.exist;

        combobox.input.dispatchEvent(
          new window.KeyboardEvent("keydown", {
            key: "ArrowDown",
            bubbles: true
          })
        );
        await wait(5);

        expect(combobox.popup.pseudoFocus).to.exist;
      });
    });

    describe("Escape", () => {
      it("dismisses the popup if it is visible", async () => {
        const combobox = document.getElementById("combobox");
        combobox.input.focus();
        expect(combobox.getAttribute("expanded")).to.equal("true");

        combobox.input.dispatchEvent(
          new window.KeyboardEvent("keydown", {
            key: "Escape",
            bubbles: true
          })
        );
        await wait(5);

        expect(combobox.hasAttribute("expanded")).to.be.false;
      });
    });

    describe("aria-activedescendant", () => {
      it("is set to the current pseudo-focus element when there is one", () => {
        const combobox = document.getElementById("combobox");
        const fourthItem = combobox.querySelector(`[data-option-index="3"]`);
        const thirdItem = combobox.querySelector(`[data-option-index="2"]`);
        expect(fourthItem).to.exist;
        expect(thirdItem).to.exist;
        combobox.focus();
        expect(combobox.input.hasAttribute("aria-activedescendant")).to.be.false;
        expect(combobox.isExpanded).to.be.true;
        
        combobox.popup.pseudoFocusItem(thirdItem);
        combobox.popup.moveDown();

        expect(combobox.input.getAttribute("aria-activedescendant")).to.equal(fourthItem.id);
      });

      it("is removed when the combobox is closed", () => {
        const combobox = document.getElementById("combobox");
        combobox.focus();
        for(let i = 0; i < 2; i++){
          combobox.popup.moveDown();
        }
        expect(combobox.isExpanded).to.be.true;
        expect(combobox.popup.pseudoFocus).to.exist;
        expect(combobox.input.hasAttribute("aria-activedescendant")).to.be.true;

        combobox.hidePopup();

        expect(combobox.input.hasAttribute("aria-activedescendant")).to.be.false;
      });
    });
  });

  describe("Misc aria roles, states, and properties tests", () => {
    beforeEach(async() => {
      document.body.innerHTML = baseMarkup;

      // Let the slotchange and other init events
      // resolve
      await wait(50);
    });

    it("aria-controls is set on the combobox input", () => {
      const combobox = document.getElementById("combobox");

      expect(combobox.input.getAttribute("aria-controls")).to.equal(combobox.popup.id);
    });

    it("aria-controls is set on the combobox input, when a new popup is swapped in", async () => {
      const combobox = document.getElementById("combobox");
      const newListbox = combobox.popup.cloneNode(true);
      newListbox.id = "new-listbox";
      combobox.popup.replaceWith(newListbox);

      await wait(5);

      expect(combobox.input.getAttribute("aria-controls")).to.equal(newListbox.id);
    });
  });

  describe("Method tests", () => {
    beforeEach(async() => {
      document.body.innerHTML = baseMarkup;

      // Let the slotchange and other init events
      // resolve
      await wait(50);
    });

    describe("#showPopup", () => {
      it(`sets the input to [aria-expanded="true"]`, () => {
        const combobox = document.getElementById("combobox");
        combobox.showPopup();
        expect(combobox.input.getAttribute("aria-expanded")).to.equal("true");
      });

      it(`sets the component to [expanded="true"]`, () => {
        const combobox = document.getElementById("combobox");
        expect(combobox.hasAttribute("expaneded")).to.be.false;
        combobox.showPopup();
        expect(combobox.getAttribute("expanded")).to.equal("true");
      });
    });

    describe("#hidePopup", () => {
      it(`removes [aria-expanded] from the input`, async () => {
        const combobox = document.getElementById("combobox");
        combobox.input.setAttribute("aria-expanded", true);
        combobox.hidePopup();

        expect(combobox.input.hasAttribute("aria-expanded")).to.be.false;
      });

      it(`removes [aria-activedescendant] from the input`, () => {
        const combobox = document.getElementById("combobox");
        combobox.input.setAttribute("aria-activedescendant", "something");
        combobox.hidePopup();

        expect(combobox.input.hasAttribute("aria-activedescendant")).to.be.false;
      });

      it(`removes this component's [expanded="true"]`, () => {
        const combobox = document.getElementById("combobox");
        combobox.setAttribute("expanded", true);
        combobox.hidePopup();

        expect(combobox.hasAttribute("expanded")).to.be.false;
      });
    });

    describe(`#handleSlotChange`, () => {
      let sandbox;
      before(() => {
        sandbox = createSandbox();
      });

      let combobox, event;
      beforeEach(() => {
        combobox = document.getElementById("combobox");
        event = {};
        event.target = {
          assignedElements: sandbox.stub(),
          getAttribute: sandbox.stub()
        };
      });

      afterEach(() => {
        sandbox.restore();
      });

      describe(`where slot[name="popup"]`, () => {
        it("adds the change event listener to the popup, if there is a popup available", () => {
          const popupEl = document.createElement("div");
          const addEventListenerSpy = sandbox.spy(popupEl, "addEventListener");
          event.target.assignedElements.returns([popupEl]);
          event.target.getAttribute.withArgs("name").returns("popup");

          combobox.handleSlotChange(event);

          // We add two event listeners (change and mousedown)
          expect(addEventListenerSpy.callCount).to.equal(2);
        });

        it("removes any event listeners already attached to the component if a new popup is slotted", () => {
          const firstPopup = document.createElement("div");
          const removeEventListenerSpy = sandbox.spy(firstPopup, "removeEventListener");
          combobox.popup = firstPopup;
          const secondPopup = document.createElement("div");
          event.target.assignedElements.returns([secondPopup]);
          event.target.getAttribute.withArgs("name").returns("popup");
          expect(removeEventListenerSpy.callCount).to.equal(0);

          combobox.handleSlotChange(event);

          // We expect two event listeners to have been removed
          // from the first popup
          expect(removeEventListenerSpy.callCount).to.equal(2);

          // We want to ensure that the first popup is _not_ attached
          // to the component as a property
          expect(combobox.popup).to.not.eql(firstPopup);
        });

        it("adds a custom id to the popup that is based on the component id (popup doesn't have an id yet)", () => {
          const popup = document.createElement("div");
          const expectedId = `${combobox.id}-popup`;
          event.target.assignedElements.returns([popup]);
          event.target.getAttribute.withArgs("name").returns("popup");

          combobox.handleSlotChange(event);

          expect(popup.id).to.equal(expectedId);
        });

        it("does not add a custom id if the popup already has an id", () => {
          const popup = document.createElement("div");
          popup.id = "test-id";
          event.target.assignedElements.returns([popup]);
          event.target.getAttribute.withArgs("name").returns("popup");

          combobox.handleSlotChange(event);

          expect(popup.id).to.equal("test-id");
        });
      });
    });
  });

  describe("Event handling and behavior tests", () => {
    let sandbox;
    beforeEach(() => {
      document.body.innerHTML = baseMarkup;
      sandbox = createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });

    
    describe("when adding a new popup to the slot", () => {
      it("sets aria-controls to the id of the incoming popup", async () => {
        const combobox = document.getElementById("combobox");
        const newListbox = document.createElement("wx-filterable-listbox");
        newListbox.setAttribute("role", "listbox");
        newListbox.setAttribute("slot", "popup");
        newListbox.id = "new-listbox";
        expect(combobox.input.getAttribute("aria-controls")).to.not.equal("new-listbox");

        combobox.popup.replaceWith(newListbox);
        await wait(25);

        expect(combobox.input.getAttribute("aria-controls")).to.equal("new-listbox");
      });
    });

    describe("when navigating from the combobox", () => {
      it("hides the popup if the user navigates beyond the top of the listbox", async () => {
        const combobox = document.getElementById("combobox");
        combobox.showPopup();
        sandbox.spy(combobox, "hidePopup");
        combobox.popup.pseudoFocusItem(
          combobox.popup.querySelector(`[role="option"]:first-of-type`)
        );
        expect(combobox.popup.pseudoFocus).to.exist;
        expect(combobox.hidePopup.callCount).to.equal(0);
        
        combobox.input.dispatchEvent(
          new window.KeyboardEvent("keydown", {
            key: "ArrowUp",
            bubbes: true
          })
        );
        await wait(5);

        expect(combobox.hidePopup.callCount).to.equal(1);
        expect(combobox.isExpanded).to.be.false;
      });

      it("hides the popup if it is open and the Escape key is pressed", async () => {
        const combobox = document.getElementById("combobox");
        combobox.input.focus();
        expect(combobox.isExpanded).to.be.true;
        sandbox.spy(combobox, "hidePopup");

        combobox.input.dispatchEvent(
          new window.KeyboardEvent("keydown", {
            key: "Escape",
            bubbles: true
          })
        );
        await wait(5);

        expect(combobox.popup.pseudoFocus).to.not.exist;
        expect(combobox.isExpanded).to.be.false;
        expect(combobox.hidePopup.callCount).to.equal(1);
      });

      it("shows the popup if the popup is hidden and the user navigates down", async () => {
        const combobox = document.getElementById("combobox");
        combobox.input.focus();
        sandbox.spy(combobox, "showPopup");
        combobox.popup.pseudoFocusItem(null); // Clear focus
        expect(combobox.showPopup.callCount).to.equal(0);

        combobox.input.dispatchEvent(
          new window.KeyboardEvent("keydown", {
            key: "ArrowDown",
            bubbles: true
          })
        );
        await wait(5);

        expect(combobox.showPopup.callCount).to.equal(1);
        expect(combobox.isExpanded).to.be.true;
      });

      it("pseudo focuses the first item if the popup is hidden and the user navigates down", async () => {
        const combobox = document.getElementById("combobox");
        combobox.input.focus();
        combobox.hidePopup();
        combobox.popup.pseudoFocusItem(null);
        const firstItem = combobox.popup.querySelectorAll(`[role="option"]`)[0];

        combobox.input.dispatchEvent(
          new window.KeyboardEvent("keydown", {
            key: "ArrowDown",
            bubbles: true
          })
        );
        await wait(5);

        expect(combobox.popup.pseudoFocus).to.eql(firstItem);
      });
    });

    describe("when a selection is made in the listbox", () => {
      it("calls hidePopup, if there is a selection", () => {
        const combobox = document.getElementById("combobox");
        combobox.input.focus();
        expect(combobox.isExpanded).to.be.true;
        sandbox.spy(combobox, "hidePopup");

        const secondItem = combobox.popup.querySelectorAll(`[role="option"]`)[1];
        combobox.popup.selectItem(secondItem);

        expect(combobox.hidePopup.callCount).to.equal(1);
      });

      it("sets the input element's value property to the textContent of the current selection, when there is a selection", () => {
        const combobox = document.getElementById("combobox");
        combobox.input.focus();
        expect(combobox.input.value).to.equal("");
        expect(combobox.popup.selection).to.not.exist;

        const thirdItem = combobox.querySelectorAll(`[role="option"]`)[2];
        combobox.popup.selectItem(thirdItem);

        expect(combobox.input.value).to.equal(thirdItem.textContent);
      });
    });

    describe("when a key is pressed in the combobox but is also handled by the popup", () => {
      it("calls the handler on the popup (ie forwards the event handler call)", async () => {
        const combobox = document.getElementById("combobox");
        combobox.showPopup();
        combobox.input.focus();
        combobox.popup.pseudoFocusItem(
          combobox.popup.querySelector(`[role="option"]:nth-of-type(2)`)
        );

        // We need to set each of the popup's key handlers
        // to be a spy, for the purposes of this test.
        const spies = {};
        Object.keys(combobox.popup.keyMapping).forEach(key => {
          spies[key] = spy();
        });
        combobox.popup.keyMapping = spies;

        // Now go through each key in the mapping and dispatch the
        // event, but on the combobox input rather than the popup/listbox.
        // Ensure that the appropriate handlers were triggered on the listbox,
        // and not just the input.
        const mappingKeys = Object.keys(spies);
        for(let i = 0; i < mappingKeys.length; i++){
          const key = mappingKeys[i];
          combobox.input.dispatchEvent(
            new window.KeyboardEvent("keydown", {
              key: key,
              bubbles: true
            })
          );
          await wait(5);

          const spy = spies[key];
          expect(spy.callCount).to.equal(1, key);
        }
      });
    });

    describe("when the toggle button is clicked", () => {
      it("and the combobox is not expanded, it opens and puts focus on the input", () => {
        const combobox = document.getElementById("combobox");
        combobox.toggleButton.click();

        expect(document.activeElement).to.eql(combobox.input);
        expect(combobox.isExpanded).to.be.true;
        expect(combobox.getAttribute("expanded")).to.equal("true");
        expect(combobox.input.getAttribute("aria-expanded")).to.equal("true");
      });

      it("and the combobox is open, it sets removes the expand properties", () => {
        const combobox = document.getElementById("combobox");
        combobox.showPopup();
        combobox.toggleButton.click();

        expect(combobox.hasAttribute("expanded")).to.be.false;
        expect(combobox.isExpanded).to.be.false;
        expect(combobox.input.hasAttribute("aria-expanded")).to.be.false;
      });
    });

    describe("when the clear button is clicked", () => {
      it("it removes pseudofocus from the popup", async () => {
        const combobox = document.getElementById("combobox");
        combobox.showPopup();
        await wait(5);
        combobox.popup.pseudoFocusItem(
          combobox.popup.querySelector(`[role="option"]:nth-of-type(3)`)
        );
        expect(combobox.popup.pseudoFocus).to.exist;

        combobox.clearButton.click();
        await wait(5);

        expect(combobox.popup.pseudoFocus).to.not.exist;
      });

      it("it sets the value of the input to a falsy value or empty string", async () => {
        const combobox = document.getElementById("combobox");
        combobox.showPopup();
        await wait(5);
        const thirdItem = combobox.popup.querySelector(`[role="option"]:nth-of-type(3)`);
        combobox.popup.selectItem(thirdItem);
        await wait(5);
        expect(combobox.input.value).to.equal(thirdItem.textContent);

        combobox.clearButton.click();
        await wait(5);

        // Setting of an input's value to null or undefined
        // will always result in it being an empty string
        expect(combobox.input.value).to.equal("");
      });

      it("put the focus back to the input element", async () => {
        const combobox = document.getElementById("combobox");
        combobox.input.focus();
        combobox.input.value = "S";
        combobox.input.dispatchEvent(
          new Event("input", { bubbles: true })
        );

        await wait(5);
        combobox.clearButton.click();
        await wait(5);

        expect(document.activeElement).to.eql(combobox.input);
      });
    });

    describe("when text is input into the input field", () => {
      it("shows the popup if it is not already open", async () => {
        const combobox = document.getElementById("combobox");
        expect(combobox.isExpanded).to.be.false;

        combobox.input.dispatchEvent(
          new Event("input")
        );
        await wait(5);;

        expect(combobox.isExpanded).to.be.true;
      });

      it("calls the popup's filter function", async () => {
        const combobox = document.getElementById("combobox");
        const filterSpy = sandbox.spy(combobox.popup, "filterText");

        combobox.input.value = "S";
        combobox.input.dispatchEvent(
          new Event("input")
        );
        await wait(10);

        expect(filterSpy.callCount).to.equal(1);
      });
    });

    describe("when the input gets focus", () => {
      it("and there are items in the popup, combobox shows the popup", async () => {
        const combobox = document.getElementById("combobox");
        expect(combobox.isExpanded).to.be.false;
        
        combobox.input.focus();
        await wait(5);

        expect(combobox.isExpanded).to.be.true;
      });
    });

    describe("setting the disabled attribute", () => {
      let combobox;
      beforeEach(() => {
        combobox = document.getElementById("combobox");
        combobox.setAttribute("disabled", true);
      });
      
      it("sets the input to disabled", () => {
        expect(combobox.input.hasAttribute("disabled")).to.be.true;
      });

      it("sets the toggle button to disabled", () => {
        expect(combobox.toggleButton.hasAttribute("disabled")).to.be.true;
      });

      it("sets the clear button to disabled", () => {
        expect(combobox.toggleButton.hasAttribute("disabled")).to.be.true;
      });

      it("does not take focus", () => {
        combobox.input.focus();

        expect(document.activeElement).to.not.eql(combobox.input);
      });
    });

    describe("Miscellaneous", () => {
      it("sets the input to the selected items label on blur, if there is a selection", async () => {
        const combobox = document.getElementById("combobox");
        combobox.input.focus();
        const secondOption = combobox.querySelectorAll(`[role="option"]`)[1];
        combobox.popup.selectItem(secondOption);
        expect(combobox.popup.selection).to.eql(secondOption);

        combobox.input.value = "S";

        combobox.input.blur();

        expect(document.activeElement).to.not.eql(combobox);
        expect(document.activeElement).to.not.eql(combobox.input);
        expect(combobox.input.value).to.equal(secondOption.textContent);
      });
    });
  });
});
