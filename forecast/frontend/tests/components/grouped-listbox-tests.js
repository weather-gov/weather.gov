import { expect } from "chai";
import { before, beforeEach } from "mocha";

const exampleMarkup = `
<wx-listbox tabindex="0" id="listbox">
    <div>Group 1</div>
    <div id="first-group" role="group">
        <li role="option" id="first">First option</li>
        <li role="option" id="second">Second option</li>
    </div>
    <div>Group 2</div>
    <div id="second-group" role="group">
        <li role="option" id="third">Third option</li>
        <li role="option" id="fourth">Fourth option</li>
        <li role="option" id="fifth">Fifth option</li>
    </div>
</wx-listbox>
`;

const wait = (milliseconds) => {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
};

describe("Listbox with grouped options tests", () => {
  before(async () => {
    await import("../../assets/js/components/combobox/listbox.js");
  });

  beforeEach(async () => {
    document.body.innerHTML = exampleMarkup;

    // Wait for slotchange events to resolve
    await wait(50);
  });

  it("can moveDown from last item in first group to first item in next group", async () => {
    const listbox = document.getElementById("listbox");
    const lastOptionFirstGroup = listbox.querySelector(`#first-group [role="option"]:nth-child(2)`);
    expect(lastOptionFirstGroup).to.exist;
    const firstOptionSecondGroup = listbox.querySelector(`#second-group [role="option"]:first-child`);
    expect(firstOptionSecondGroup).to.exist;

    listbox.pseudoFocusItem(lastOptionFirstGroup);
    listbox.moveDown();

    expect(listbox.pseudoFocus).to.eql(firstOptionSecondGroup);
  });

  it("can moveUp from the first item in the last group to the last item in the previous group", () => {
    const listbox = document.getElementById("listbox");
    const lastOptionFirstGroup = listbox.querySelector(`#first-group [role="option"]:nth-child(2)`);
    expect(lastOptionFirstGroup).to.exist;
    const firstOptionSecondGroup = listbox.querySelector(`#second-group [role="option"]:first-child`);
    expect(firstOptionSecondGroup).to.exist;

    listbox.pseudoFocusItem(firstOptionSecondGroup);
    listbox.moveUp();

    expect(listbox.pseudoFocus).to.eql(lastOptionFirstGroup);
  });

  it("Home navigates to the first item in the first group", () => {
    const listbox = document.getElementById("listbox");
    const fourthItem = document.getElementById("fourth");
    listbox.pseudoFocusItem(fourthItem);

    const firstItem = document.getElementById("first");
    listbox.moveHome();

    expect(listbox.pseudoFocus).to.eql(firstItem);
  });

  it("End navigates to the last item in the last group", () => {
    const listbox = document.getElementById("listbox");
    const secondItem = document.getElementById("second");
    const lastItem = document.getElementById("fifth");
    listbox.pseudoFocusItem(secondItem);

    listbox.moveEnd();

    expect(listbox.pseudoFocus).to.eql(lastItem);
  });
});
