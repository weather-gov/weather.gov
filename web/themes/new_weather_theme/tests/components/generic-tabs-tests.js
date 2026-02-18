/* eslint no-unused-expressions: off */
import { expect } from "chai";

const EXAMPLE = `
<wx-tabs role="tablist">
    <button role="tab" aria-selected="true" aria-controls="tab1" id="button1">
        Tab 1
    </button>
    <button role="tab" aria-selected="false" aria-controls="tab2" id="button2">
        Tab 2
    </button>
    <button role="tab" aria-selected="false" aria-controls="tab3" id="button3">
        Tab 3
    </button>
</wx-tabs>
<div id="tab1" role="tabpanel" aria-labelledby="button1">
    Tab 1 content
</div>
<div id="tab2" role="tabpanel" aria-labelledby="button2">
    Tab 2 content
</div>
<div id="tab3" role="tabpanel" aria-labelledby="button3">
    Tab 3 content
</div>
`;

describe("Tab web component basic tests", () => {
  before(async() => {
    await import("../../assets/js/components/Tabs.js");
  });

  beforeEach(() => {
    document.body.innerHTML = EXAMPLE;
    document.body.querySelector('button[role="tab"]:first-child').focus();
  });

  it("Has the correct number of tabs", () => {
    const tablist = document.querySelector("wx-tabs");

    expect(tablist.tabs.length).to.equal(3);
  });

  it("Has the correct number of tabpanels", () => {
    const tablist = document.querySelector("wx-tabs");

    expect(tablist.tabpanels.length).to.equal(3);
  });

  it("sets the correct aria-selected values on all tabs (when clicking 2nd)", () => {
    document.body.querySelector('[role="tab"]:nth-child(2)').click();
    const actualFirst = document.body.querySelector('[role="tab"]:nth-child(1)');
    const actualSecond = document.body.querySelector('[role="tab"]:nth-child(2)');
    const actualThird = document.body.querySelector('[role="tab"]:nth-child(3)');

    expect(actualFirst.getAttribute("aria-selected")).to.eql("false");
    expect(actualSecond.getAttribute("aria-selected")).to.eql("true");
    expect(actualThird.getAttribute("aria-selected")).to.eql("false");
  });

  it("pressing enter on the second tab will select it", () => {
    const tablist = document.querySelector("wx-tabs");
    const secondTab = tablist.querySelector('[role="tab"]:nth-child(2)');
    secondTab.focus();
    const evt = new window.KeyboardEvent("keydown", { key: "Enter" });
    tablist.dispatchEvent(evt);

    expect(secondTab.getAttribute("aria-selected")).to.eql("true");
  });

  it("pressing space on the second tab will select it", () => {
    const tablist = document.querySelector("wx-tabs");
    const secondTab = tablist.querySelector('[role="tab"]:nth-child(2)');
    secondTab.focus();
    const evt = new window.KeyboardEvent("keydown", { key: "Space" });
    tablist.dispatchEvent(evt);

    expect(secondTab.getAttribute("aria-selected")).to.eql("true");
  });

  it("pressing real browser space key (key=' ') on the second tab will select it", () => {
    // Real browsers send { key: " " } (a literal space character) for
    // the spacebar, not { key: "Space" }. This test verifies the shared
    // keyboard utility handles that correctly.
    const tablist = document.querySelector("wx-tabs");
    const secondTab = tablist.querySelector('[role="tab"]:nth-child(2)');
    secondTab.focus();
    const evt = new window.KeyboardEvent("keydown", { key: " " });
    tablist.dispatchEvent(evt);

    expect(secondTab.getAttribute("aria-selected")).to.eql("true");
  });

  it("sets the correct aria-selected values on all tabs (when clicking 3rd)", () => {
    document.body.querySelector('[role="tab"]:nth-child(3)').click();
    const actualFirst = document.body.querySelector('[role="tab"]:nth-child(1)');
    const actualSecond = document.body.querySelector('[role="tab"]:nth-child(2)');
    const actualThird = document.body.querySelector('[role="tab"]:nth-child(3)');

    expect(actualFirst.getAttribute("aria-selected")).to.eql("false");
    expect(actualSecond.getAttribute("aria-selected")).to.eql("false");
    expect(actualThird.getAttribute("aria-selected")).to.eql("true");
  });

  it("right arrow navigation works", () => {
    const tablist = document.querySelector("wx-tabs");
    let evt = new window.KeyboardEvent("keydown", {key: "ArrowRight"});

    // First instance, highlights second element
    tablist.dispatchEvent(evt);
    expect(document.activeElement.matches('[role="tab"]:nth-child(2)')).to.be.true;

    // Second instance, focuses last element
    evt = new window.KeyboardEvent("keydown", {key: "ArrowRight"});
    tablist.dispatchEvent(evt);
    expect(document.activeElement.matches('[role="tab"]:last-child')).to.be.true;

    // Third time should loop around to the beginning of the tabs
    evt = new window.KeyboardEvent("keydown", {key: "ArrowRight"});
    tablist.dispatchEvent(evt);
    expect(document.activeElement.matches('[role="tab"]:first-child')).to.be.true;
  });

  it("left arrow navigation works", () => {
    const tablist = document.querySelector("wx-tabs");
    let evt = new window.KeyboardEvent("keydown", {key: "ArrowLeft"});

    // First instance, loops around to focus on the last tab
    tablist.dispatchEvent(evt);
    expect(document.activeElement.matches('[role="tab"]:last-child')).to.be.true;

    // Second instance, loops around to the second tab
    evt = new window.KeyboardEvent("keydown", {key: "ArrowLeft"});
    tablist.dispatchEvent(evt);
    expect(document.activeElement.matches('[role="tab"]:nth-child(2)')).to.be.true;

    // Third time, comes back to focus on first element
    evt = new window.KeyboardEvent("keydown", {key: "ArrowLeft"});
    tablist.dispatchEvent(evt);
    expect(document.activeElement.matches('[role="tab"]:first-child')).to.be.true;
  });

  it("Home key focuses on the first tab", () => {
    const tablist = document.querySelector("wx-tabs");
    const evt = new window.KeyboardEvent("keydown", {key: "Home"});

    // Start by focusing the second tab so Home has somewhere to go
    tablist.tabs[1].focus();
    expect(document.activeElement.matches('[role="tab"]:nth-child(2)')).to.be.true;

    // Now push the Home key to focus first item
    tablist.dispatchEvent(evt);
    expect(document.activeElement.matches('[role="tab"]:first-child')).to.be.true;
  });

  it("End key focuses on the last tab", () => {
    const tablist = document.querySelector("wx-tabs");
    const evt = new window.KeyboardEvent("keydown", {key: "End"});

    // Start by focusing the second tab so End has somewhere to go
    tablist.tabs[1].focus();
    expect(document.activeElement.matches('[role="tab"]:nth-child(2)')).to.be.true;

    // Now push the End key to focus last item
    tablist.dispatchEvent(evt);
    expect(document.activeElement.matches('[role="tab"]:last-child')).to.be.true;
  });

  it("Selecting a tab updates the corresponding tabpanel data selection attribute", () => {
    const tablist = document.querySelector("wx-tabs");
    tablist.tabs[1].click();
    const expected = ["false", "true", "false"];
    const actual = tablist.tabpanels.map(panel => panel.getAttribute("data-tabpanel-selected"));

    expect(actual).to.eql(expected);
  });

  it("Selecting a tab updates the component's data-selected attribute", () => {
    const tablist = document.querySelector("wx-tabs");
    tablist.tabs[1].click();
    const expected = tablist.tabpanels[1].id
    const actual = tablist.getAttribute("data-selected");

    expect(actual).to.eql(expected);
  })
});
