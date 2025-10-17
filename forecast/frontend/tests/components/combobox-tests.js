import { assert, expect } from "chai";
import { beforeEach } from "mocha";
import { spy } from "sinon";

describe("generic combo box", () => {
  before(async () => {
    await import("../../assets/js/components/combo-box.js");
  });

  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("has the element", () => {
    const combobox = document.createElement("wx-combo-box");
    document.body.append(combobox);

    assert.exists(document.querySelector("wx-combo-box"));
    assert.exists(window.customElements.get("wx-combo-box"));
  });

  it("includes a hidden named element if a name is provided", () => {
    const combobox = document.createElement("wx-combo-box");
    combobox.setAttribute("name", "special hidden input");
    document.body.append(combobox);

    assert.exists(
      document.querySelector(`wx-combo-box input[name="special hidden input"]`),
    );
  });

  it("pre-populates the list from the HTML attribute", () => {
    const combobox = document.createElement("wx-combo-box");
    combobox.setAttribute(
      "items",
      JSON.stringify([
        { value: "value #1", text: "text #1" },
        { value: "value #2", text: "text #2" },
      ]),
    );
    document.body.append(combobox);

    assert.exists(
      document.querySelector(`wx-combo-box li[data-value="value #1"]`),
    );
    assert.exists(
      document.querySelector(`wx-combo-box li[data-value="value #2"]`),
    );
  });

  it("pre-populates the list from the HTML attribute and pre-selects one", () => {
    const combobox = document.createElement("wx-combo-box");

    // While we're here, also check that the value of the named input gets set.
    combobox.setAttribute("name", "pretty pretty pony");

    combobox.setAttribute(
      "items",
      JSON.stringify([
        { value: "value #1", text: "text #1" },
        { value: "value #2", text: "text #2" },
      ]),
    );
    combobox.setAttribute("selected", "value #2");
    document.body.append(combobox);

    assert.exists(
      document.querySelector(
        `wx-combo-box li[data-value="value #2"][aria-selected="true"]`,
      ),
    );

    expect(
      document.querySelector(`wx-combo-box input[name="pretty pretty pony"]`)
        .value,
    ).to.equal("value #2");
  });

  it("updates its own 'selected' attribute when an item is chosen", () => {
    const combobox = document.createElement("wx-combo-box");
    combobox.setAttribute(
      "items",
      JSON.stringify([
        { value: "value #1", text: "text #1" },
        { value: "value #2", text: "text #2" },
        { value: "value #3", text: "text #3" },
      ]),
    );
    document.body.append(combobox);

    // Select the second item in the this
    combobox.showList();
    const secondListItem = combobox.listbox.querySelector('li[role="option"]:nth-child(2)');
    expect(secondListItem).to.exist;
    secondListItem.click();

    expect(
      combobox.getAttribute("selected")
    ).to.equal("value #2");
    
  });

  describe("clears the list", () => {
    let cb;
    beforeEach(() => {
      cb = document.createElement("wx-combo-box");
      cb.setAttribute(
        "items",
        JSON.stringify([
          { value: "value #1", text: "text #1" },
          { value: "value #2", text: "text #2" },
          { value: "value #3", text: "text #3" },
        ]),
      );
      document.body.append(cb);

      // Press down to select an element and then choose it.
      cb.dispatchEvent(
        new window.KeyboardEvent("keydown", { key: "ArrowDown" }),
      );
      cb.chooseOption({});
    });

    it("by calling the function", () => {
      expect(cb.value).to.equal("value #1");

      cb.clear();

      expect(cb.value).to.equal(null);
    });

    it("by clicking the button", () => {
      expect(cb.value).to.equal("value #1");

      cb.querySelector(`button[slot="clear-button"]`).click();

      expect(cb.value).to.equal(null);
    });
  });

  describe("it handles events", () => {
    let combobox;
    beforeEach(() => {
      combobox = document.createElement("wx-combo-box");
      document.body.append(combobox);
    });

    const isExpanded = () => {
      return (
        combobox.getAttribute("expanded") === "true" &&
        combobox
          .querySelector(`input[slot="input"]`)
          .getAttribute("aria-expanded") === "true"
      );
    };

    describe("toggles", () => {
      describe("with the toggle button", () => {
        it("expands the list when the list is collapsed", () => {
          combobox
            .querySelector(`input[slot="input"]`)
            .setAttribute("aria-expanded", "false");

          combobox.querySelector("button.wx-combo-box__toggle-list").click();

          expect(isExpanded()).to.equal(true);
        });

        it("collapses the list when the list is expanded", () => {
          combobox
            .querySelector(`input[slot="input"]`)
            .setAttribute("aria-expanded", "true");

          combobox.querySelector("button.wx-combo-box__toggle-list").click();

          expect(isExpanded()).to.equal(false);
        });
      });

      it("with the toggle function", () => {
        // Initially not expanded
        expect(isExpanded()).to.equal(false);

        combobox.toggleList();

        // now expanded
        expect(isExpanded()).to.equal(true);

        combobox.toggleList();

        // and collapsed again
        expect(isExpanded()).to.equal(false);
      });
    });

    describe("pressing the enter key while the toggle button is focused", () => {
      it("expands the list when the list is collapsed", () => {
        combobox
          .querySelector(`input[slot="input"]`)
          .setAttribute("aria-expanded", "false");

        combobox
          .querySelector("button.wx-combo-box__toggle-list")
          .dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter" }));

        expect(isExpanded()).to.equal(true);
      });

      it("collapses the list when the list is expanded", () => {
        combobox
          .querySelector(`input[slot="input"]`)
          .setAttribute("aria-expanded", "true");

        combobox
          .querySelector("button.wx-combo-box__toggle-list")
          .dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter" }));

        expect(isExpanded()).to.equal(false);
      });
    });

    describe("navigates up and down", () => {
      beforeEach(() => {
        combobox.setListItems([
          { value: "value #1", text: "text #1" },
          { value: "value #2", text: "text #2" },
          { value: "value #3", text: "text #3" },
        ]);
      });

      describe("pressing the down key", () => {
        it("expands the list if it is collapsed", () => {
          combobox.dispatchEvent(
            new window.KeyboardEvent("keydown", { key: "ArrowDown" }),
          );

          expect(isExpanded()).to.equal(true);

          expect(
            combobox
              .querySelector(`li[role="option"]`)
              .getAttribute("aria-selected"),
          ).to.equal("true");
        });

        it("selects the next item", () => {
          combobox.dispatchEvent(
            new window.KeyboardEvent("keydown", { key: "ArrowDown" }),
          );
          combobox.dispatchEvent(
            new window.KeyboardEvent("keydown", { key: "ArrowDown" }),
          );

          expect(
            combobox
              .querySelector(`li[role="option"]:nth-child(2)`)
              .getAttribute("aria-selected"),
          ).to.equal("true");
        });
      });

      describe("pressing the up key", () => {
        beforeEach(() => {
          // Start with the list open. The up key will never open the list.
          document.querySelector("wx-combo-box").showList();
        });

        it("closes the list if the first item is selected", () => {
          document
            .querySelector("wx-combo-box")
            .dispatchEvent(
              new window.KeyboardEvent("keydown", { key: "ArrowUp" }),
            );

          expect(
            document.querySelector("wx-combo-box").getAttribute("expanded"),
          ).to.equal("false");
          expect(
            document
              .querySelector(`wx-combo-box input[slot="input"]`)
              .getAttribute("aria-expanded"),
          ).to.equal("false");
        });

        it("navigates up if a later item is selected", () => {
          const cb = document.querySelector("wx-combo-box");

          // Arrow down first. This should put us on element #2.
          cb.dispatchEvent(
            new window.KeyboardEvent("keydown", { key: "ArrowDown" }),
          );

          // Then arrow up!
          cb.dispatchEvent(
            new window.KeyboardEvent("keydown", { key: "ArrowUp" }),
          );

          // Expected the selected one to also be the first one.
          expect(cb.querySelector(`li[aria-selected="true"]`)).to.equal(
            cb.querySelector(`li[role="option"]`),
          );
        });
      });
    });

    // I can't quite figure out how to trigger this event properly.
    /*describe("filters the list on text input", () => {
      beforeEach(() => {
        document.innerHTML = "";
        combobox = document.createElement("wx-combo-box");
        combobox.setAttribute(
          "items",
          JSON.stringify([
            { value: "value #1", text: "text #1" },
            { value: "value #2", text: "text #2" },
          ]),
        );
        document.body.append(combobox);
      });

      it("", () => {
        combobox.dispatchEvent(
          new window.KeyboardEvent("keydown", { key: "ArrowDown" }),
        );
        combobox.dispatchEvent(new window.InputEvent("input"));
      });
    });*/

    it("it expands when focused", () => {
      expect(isExpanded()).to.equal(false);

      combobox
        .querySelector("input")
        .dispatchEvent(new window.FocusEvent("focus"));

      expect(isExpanded()).to.equal(true);
    });
  });
});

describe("#resetListAndListboxItems tests", () => {
  let initialListItems, combobox;
  beforeEach(() => {
    initialListItems = [
      { value: "Item 1 value", text: "Item 1"},
      { value: "Item 2 value", text: "Item 2"},
      { value: "Item 3 value", text: "Item 3"}
    ];
    combobox = document.createElement("wx-combo-box");
    combobox.setAttribute("items", JSON.stringify(initialListItems));
    document.body.innerHTML = "";
    document.body.append(combobox);
  });
  
  it("has the initial list items set", () => {
    const expectedItems = initialListItems;
    const actualItems = combobox.listItems;

    expect(expectedItems).to.eql(actualItems);
  });

  it("does not set items when listItems is not an array (early returns)", () => {
    const nextListItems = "";
    const clearSpy = spy(combobox, "setListItems");
    
    combobox.resetListAndListboxItems(nextListItems);

    expect(clearSpy.calledOnce).to.be.false;
  });

  it("sets list items when the passed items is an array", () => {
    const nextListItems = [
      { value: 1, text: "#1"},
      { value: 2, text: "#2"}
    ];

    combobox.resetListAndListboxItems(nextListItems);

    expect(combobox.listItems).to.eql(nextListItems);
  });

  it("updates the 'selected' attribute to match the first new list item's value (new list)", () => {
    const nextListItems = [
      { value: "First Value", text: "#1"},
      { value: "Second Value", text: "#2"}
    ];
    const expectedSelectedValue = nextListItems[0].value;

    expect(combobox.getAttribute("selected")).to.not.equal(expectedSelectedValue);

    combobox.resetListAndListboxItems(nextListItems);

    expect(combobox.getAttribute("selected")).to.equal(expectedSelectedValue);
  });

  it("pseudo-focusses the first list item (new list)", () => {
    const nextListItems = [
      { value: "First Value", text: "#1"},
      { value: "Second Value", text: "#2"}
    ];
    const pseudoFocusSpy = spy(combobox, "pseudoFocusListItem");
    combobox.resetListAndListboxItems(nextListItems);

    const expected = combobox.listbox.querySelector("li:first-child");
    expect(expected).to.exist;

    expect(pseudoFocusSpy.calledOnceWithExactly(expected)).to.equal(true);
  });

  it("keeps the 'selected' attribute when updating to a list that contains the same value in it (overlap list)", () => {
    // See the definition of initialListValues in this
    // describe block's beforeEach
    const nextListItems = [
      { value: "Item 0 value", text: "Item 0"},
      { value: "Item 1 value", text: "Item 1"}, // Previously the 'selected' item (overlaps)
      { value: "Item 2 value", text: "Item 2"},
      { value: "Item 3 value", text: "Item 3"}
    ];

    const currentSelectedValue = combobox.getAttribute("selected");
    expect(currentSelectedValue).to.equal(nextListItems[1].value);

    combobox.resetListAndListboxItems(nextListItems);
    const nextSelectedValue = combobox.getAttribute("selected");
    expect(nextSelectedValue).to.not.equal(nextListItems[0].value);
    expect(nextSelectedValue).to.equal(nextListItems[1].value);
    expect(nextSelectedValue).to.equal(currentSelectedValue);
  });

  it("pseudo-focusses the element of the existing selected value when updating to a list that overlaps", () => {
    // See the definition of initialListValues in this
    // describe block's beforeEach
    const nextListItems = [
      { value: "Item 0 value", text: "Item 0"},
      { value: "Item 1 value", text: "Item 1"}, // Previously the 'selected' item (overlaps)
      { value: "Item 2 value", text: "Item 2"},
      { value: "Item 3 value", text: "Item 3"}
    ];

    const pseudoFocusSpy = spy(combobox, "pseudoFocusListItem");
    combobox.resetListAndListboxItems(nextListItems);

    const expected = combobox.listbox.querySelector("li:nth-child(2)");

    expect(pseudoFocusSpy.calledOnceWithExactly(expected)).to.equal(true);
  });
});
