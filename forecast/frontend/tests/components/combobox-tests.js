import { assert, expect } from "chai";

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
