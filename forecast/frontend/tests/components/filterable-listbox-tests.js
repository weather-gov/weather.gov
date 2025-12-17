import { expect } from "chai";
import { before, beforeEach, afterEach, after } from "mocha";
import { createSandbox } from "sinon";

const exampleMarkup = `
<wx-filterable-listbox tabindex="0" id="listbox">
  <li role="option" id="first">First option</li>
  <li role="option" id="second">Second option</li>
  <li role="option" id="third">Third option</li>
  <li role="option" id="fourth">Fourth option</li>
  <li role="option" id="fifth">Fifth option</li>
</wx-filterable-listbox>
`;

const groupedExampleMarkup = `
<wx-filterable-listbox tabindex="0" id="listbox">
    <div>Group 1</div>
    <div id="first-group" role="group" data-filter-ignore="true">
        <li role="option" id="first">First option</li>
        <li role="option" id="second">Second option</li>
    </div>
    <div>Group 2</div>
    <div id="second-group" role="group">
        <li role="option" id="third">Third option</li>
        <li role="option" id="fourth">Fourth option</li>
        <li role="option" id="fifth">Fifth option</li>
    </div>
</wx-filterable-listbox>
`;

const wait = (milliseconds) => {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
};

describe("Listbox component tests", () => {
  before(async () => {
    await import("../../assets/js/components/combobox/filterable-listbox.js");
  });


  describe("#getFilterSource", () => {
    let sandbox, methodSpy;
    before(() => {
      document.body.innerHTML = exampleMarkup;
      sandbox = createSandbox();
      const listbox = document.getElementById("listbox");
      methodSpy = sandbox.spy(listbox, "getFilterSource");
    });

    after(() => {
      sandbox.restore();
    });

    it("will add the hidden input and set the cached items on first call", async () => {
      const listbox = document.getElementById("listbox");
      expect(listbox._cachedItems).to.not.exist;
      expect(listbox.querySelector(`input[type="hidden"]`)).to.not.exist;

      const filterSource = listbox.getFilterSource();
      await wait(50);
      
      expect(filterSource).to.exist;

      expect(methodSpy.callCount).to.equal(1);
      expect(listbox._cachedItems).to.exist;
      expect(filterSource.querySelector(`input[type="hidden"]`)).to.exist;
    });

    it("will return the existing cached items, when called with the input present", async () => {
      const listbox = document.getElementById("listbox");
      expect(listbox._cachedItems).to.exist;

      const filterSource = listbox.getFilterSource();

      expect(listbox._cachedItems).to.eql(filterSource);
      expect(methodSpy.callCount).to.equal(2);
    });

    it("will return a new set of cached items when called without the input present", () => {
      const listbox = document.getElementById("listbox");
      const cachedItems = listbox._cachedItems;
      cachedItems.querySelector(`input[type="hidden"]`).remove();

      const filterSource = listbox.getFilterSource();

      expect(filterSource).to.not.eql(cachedItems);
      expect(methodSpy.callCount).to.equal(3);
    });
  });

  describe("#clearFilter", () => {
    before(async () => {
      document.body.innerHTML = exampleMarkup;
      await wait(50);

      // Call getFilterSource initially, since it lazy-sets
      // the cached version of the markup
      document.getElementById("listbox").getFilterSource();
    });

    it("restores the component's inners from the cached source version", () => {
      const listbox = document.getElementById("listbox");
      const addedItem = document.createElement("li");
      addedItem.setAttribute("role", "option");
      addedItem.id = "sixth";
      addedItem.textContent = "Sixth option";
      listbox.append(addedItem);
      expect(listbox.querySelector(`[id="sixth"]`)).to.exist;
      
      listbox.clearFilter();

      expect(listbox.querySelector(`[id="sixth"]`)).to.not.exist;
    });
  });

  describe("#filterText", () => {
    let sandbox, methodSpy;
    beforeEach(async () => {
      document.body.innerHTML = exampleMarkup;
      await wait(50);
      sandbox = createSandbox();
      const listbox = document.getElementById("listbox");
      methodSpy = sandbox.spy(listbox, "getFilterSource");
    });

    afterEach(() => {
      sandbox.restore();
    });

    it("will remove any options that don't have 'd' in the text", () => {
      const listbox = document.getElementById("listbox");
      const expectedToHave = [
        "second",
        "third"
      ];
      const expectedToNotHave = [
        "first",
        "fourth",
        "fifth"
      ];

      listbox.filterText("d");

      // We expect the listbox to have the options with 'd' in
      //  the text
      expectedToHave.forEach(id => {
        expect(listbox.querySelector([`[id="${id}"]`])).to.exist;
      });

      // We expect the listbox to no longer contain options
      // without 'd' in the text
      expectedToNotHave.forEach(id => {
        expect(listbox.querySelector(`[id="${id}"]`)).to.not.exist;
      });

      // getFilterSource should have been called once
      expect(methodSpy.callCount).to.equal(1);
    });

    it(`does not filter out items with the [data-filter-ignore="true"]`, () => {
      const listbox = document.getElementById("listbox");

      // Restore the list and invalidate the cache
      listbox.clearFilter();
      listbox._cachedItems = null;

      // Create a new ignored item to add
      const ignoredItem = document.createElement("li");
      ignoredItem.setAttribute("role", "option");
      ignoredItem.setAttribute("data-filter-ignore", "true");
      ignoredItem.id = "should-not-filter";
      ignoredItem.textContent = "Wont filter out";
      listbox.prepend(ignoredItem);
      expect(listbox.querySelector(`[id="should-not-filter"]`)).to.exist;
      expect(ignoredItem.matches(`:not([data-filter-ignore="true"]) [role="option"]:not([data-filter-ignore="true"])`)).to.be.false;

      listbox.filterText("d");

      // We expect the added item to still be present, even though
      // its text does _not_ contain the letter 'd', because we have
      // set the [data-filter-ignore] attribute to true
      expect(listbox.querySelector(`[id="should-not-filter"]`)).to.exist;
    });

    describe("when using grouped options", () => {
      it(`does not filter options that are in a group with [data-filter-ignore="true"]`, async () => {
        document.body.innerHTML = groupedExampleMarkup;
        const listbox = document.getElementById("listbox");

        const expectedToHave = [
          "first", // doesn't have 'd', but is in a group with filter-ignore
          "second",
          "third"
        ];
        const expectedToNotHave = [
          "fourth",
          "fifth"
        ];

        listbox.filterText("d");

        expectedToHave.forEach(id => {
          expect(
            listbox.querySelector(`[id="${id}"]`)
          ).to.exist;
        });

        expectedToNotHave.forEach(id => {
          expect(
            listbox.querySelector(`[id="${id}"]`)
          ).to.not.exist;
        });
      });

      it("removes any groups whose options have been completely filtered out", () => {
        document.body.innerHTML = groupedExampleMarkup;
        const listbox = document.getElementById("listbox");

        listbox.filterText("x");

        const firstGroup = listbox.querySelector(`[id="first-group"]`);
        const secondGroup = listbox.querySelector(`[id="second-group"]`);

        expect(firstGroup).to.exist;
        expect(secondGroup).to.not.exist;
      });
    });
  });
});
