/* eslint no-unused-expressions: off */
import { expect } from "chai";

// Test fixture matching the structure used in production.
// Each panel carries data-tabpanel-selected so the component
// can manage tabindex on initialization.
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
<div id="tab1" role="tabpanel" data-tabpanel-selected="true" aria-labelledby="button1">
    Tab 1 content
</div>
<div id="tab2" role="tabpanel" data-tabpanel-selected="false" aria-labelledby="button2">
    Tab 2 content
</div>
<div id="tab3" role="tabpanel" data-tabpanel-selected="false" aria-labelledby="button3">
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
  });

  // --- Tabindex management (WCAG roving tabindex) ---

  it("on init, the selected tab has tabindex 0 and others have tabindex -1", () => {
    const tablist = document.querySelector("wx-tabs");
    const tabindexValues = tablist.tabs.map(t => t.getAttribute("tabindex"));

    // Only the first tab (aria-selected="true") should be in the Tab order
    expect(tabindexValues).to.eql(["0", "-1", "-1"]);
  });

  it("on init, the active tabpanel has tabindex 0 and others have tabindex -1", () => {
    const tablist = document.querySelector("wx-tabs");
    const panelTabindexValues = tablist.tabpanels.map(p => p.getAttribute("tabindex"));

    // The first panel (data-tabpanel-selected="true") should be focusable
    expect(panelTabindexValues).to.eql(["0", "-1", "-1"]);
  });

  it("clicking a different tab moves tabindex 0 to that tab", () => {
    const tablist = document.querySelector("wx-tabs");

    // Switch to the third tab
    tablist.tabs[2].click();
    const tabindexValues = tablist.tabs.map(t => t.getAttribute("tabindex"));

    // Now only the third tab should carry tabindex="0"
    expect(tabindexValues).to.eql(["-1", "-1", "0"]);
  });

  it("clicking a different tab moves tabindex 0 to the corresponding panel", () => {
    const tablist = document.querySelector("wx-tabs");

    // Switch to the second tab
    tablist.tabs[1].click();
    const panelTabindexValues = tablist.tabpanels.map(p => p.getAttribute("tabindex"));

    // Second panel should now be the focusable one
    expect(panelTabindexValues).to.eql(["-1", "0", "-1"]);
  });
});
