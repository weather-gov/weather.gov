import { expect } from "chai";
import { afterEach, beforeEach } from "mocha";
import { createSandbox } from "sinon";
import { WX_GHWO_DETAILS_LOADER_TIMEOUT } from "../../assets/js/components/ghwo-county-selector.js";

const wait = async (milliseconds) => {
  await new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, milliseconds);
  });
};

describe("<wx-ghwo-county-selector> component tests", () => {
  let component, sandbox;

  before(async () => {
    await import("../../assets/js/components/ghwo-county-selector.js");
    await import("../../assets/js/components/combo-box.js");
    sandbox = createSandbox();
  });

  after(() => {
    sandbox.restore();
    document.body.innerHTML = "";
  });

  beforeEach(() => {
    document.body.innerHTML = "";
    component = document.createElement("wx-ghwo-selector");
    component.setAttribute("state-target", "#state-select");
    component.setAttribute("county-target", "#county-select");

    // Append the underlying form
    const form = document.createElement("form");
    form.setAttribute("method", "POST");
    form.setAttribute("action", "/counties/ghwo/");
    component.append(form);

    // Stub out form submission ourselves
    window.HTMLFormElement.prototype.submit = sandbox.stub();

    // JSDOM does not have the `scrollIntoView` method,
    // so we need to stub it out here on all elements.
    // The sub will be restored as a normal part of
    window.HTMLElement.prototype.scrollIntoView = sandbox.stub();

    // Oddly, other tests in the suite appear to stub
    // form submission. So just in case, let's restore
    // the stub if present
    // if(form.submit.restore){
    //   form.submit.restore();
    //   window.HTMLFormElement.prototype.submit = sandbox.stub();
    // }

    // Add a state combobox
    const stateCombo = document.createElement("wx-combo-box");
    stateCombo.setAttribute("name", "state-select");
    stateCombo.id = "state-select";
    stateCombo.setAttribute(
      "items",
      JSON.stringify([
        { value: "1", text: "State 1" },
        { value: "2", text: "State 2" },
        { value: "3", text: "State 3" },
      ]),
    );
    form.append(stateCombo);

    // Add a county combobox
    const countyCombo = document.createElement("wx-combo-box");
    countyCombo.setAttribute("name", "county-select");
    countyCombo.id = "county-select";
    countyCombo.setAttribute(
      "items",
      JSON.stringify([
        { value: "1", text: "County 1" },
        { value: "2", text: "County 2" },
        { value: "3", text: "County 3" },
      ]),
    );
    form.append(countyCombo);

    // Add the hidden inputs
    ["current-state", "current-county"].forEach((name) => {
      const input = document.createElement("input");
      input.setAttribute("type", "hidden");
      input.setAttribute("name", name);
      input.id = name;
      input.value = "1";
      form.append(input);
    });

    // Add component to body
    document.body.append(component);

    // Add the county details area and the
    // loader template
    const detailsElement = document.createElement("div");
    detailsElement.setAttribute(
      "wx-ghwo-details",
      component.countyCombobox.getAttribute("selected"),
    );
    document.body.append(detailsElement);
    const template = document.createElement("template");
    template.id = "ghwo-wx-loader";
    template.innerHTML = `<div id="loader"></div>`;
    document.body.append(template);
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("calls form submit when async is false and state combobox changes", () => {
    const form = component.querySelector("form");
    const stateCombo = component.querySelector(
      `wx-combo-box[name="state-select"]`,
    );
    stateCombo.value = "random state";
    stateCombo.dispatchEvent(new Event("change", { bubbles: true }));

    expect(form.submit.callCount).to.equal(1);
  });

  it("calls form submit when async is false and county combobox changes", () => {
    const form = component.querySelector("form");
    const countyCombo = component.countyCombobox;
    countyCombo.value = "random county";
    countyCombo.dispatchEvent(new Event("change", { bubbles: true }));

    expect(form.submit.callCount).to.equal(1);
  });

  it("does _not_ call fetchUpdatedSelectComponent when async method and county combobox changes", () => {
    const countyCombo = component.countyCombobox;
    sandbox.stub(component, "fetchUpdatedSelectComponent");
    expect(component.fetchUpdatedSelectComponent.callCount).to.equal(0);
    component.setAttribute("method", "async");

    countyCombo.dispatchEvent(new Event("change", { bubbles: true }));

    expect(component.fetchUpdatedSelectComponent.callCount).to.equal(0);
  });

  it("does _not_ call fetchAndUpdateDetailsElements when async method and county combobox is cleared", () => {
    const countyCombo = component.countyCombobox;
    sandbox.stub(component, "fetchAndUpdateDetailsElements");
    expect(component.fetchAndUpdateDetailsElements.callCount).to.equal(0);
    component.setAttribute("method", "async");

    countyCombo.value = "";
    countyCombo.dispatchEvent(new Event("change", { bubbles: true }));

    expect(component.fetchAndUpdateDetailsElements.callCount).to.equal(0);
  });

  it("calls fetchAndUpdateDetailsElements when async method and county combobox changes", () => {
    const countyCombo = component.countyCombobox;
    sandbox.stub(component, "fetchAndUpdateDetailsElements");
    expect(component.fetchAndUpdateDetailsElements.callCount).to.equal(0);
    component.setAttribute("method", "async");

    countyCombo.value = "random county";
    countyCombo.dispatchEvent(new Event("change", { bubbles: true }));

    expect(component.fetchAndUpdateDetailsElements.callCount).to.equal(1);
  });

  it("calls fetchUpdatedSelectComponent when async method and state combobox changes", () => {
    const stateCombo = component.stateCombobox;
    sandbox.stub(component, "fetchUpdatedSelectComponent");
    expect(component.fetchUpdatedSelectComponent.callCount).to.equal(0);
    component.setAttribute("method", "async");

    stateCombo.value = "random state";
    stateCombo.dispatchEvent(new Event("change", { bubbles: true }));

    expect(component.fetchUpdatedSelectComponent.callCount).to.equal(1);
  });

  it("calls fetchAndUpdateDetailsElements when async method and state combobox changes", async () => {
    // Stub out fetchUpdatedSelectComponent, so that it resolves to 200.
    // We do this here because when the state combobox changes,
    // fetchAndUpdateDetailsElements is only triggered once the
    // initial call to fetchUpdatedSelectComponent returns and is 200/OK
    sandbox
      .stub(component, "fetchUpdatedSelectComponent")
      .resolves(new Response("", { status: 200 }));

    const stateCombo = component.stateCombobox;
    sandbox.stub(component, "fetchAndUpdateDetailsElements").resolves(true);
    expect(component.fetchAndUpdateDetailsElements.callCount).to.equal(0);
    component.setAttribute("method", "async");

    stateCombo.value = "random state";
    await stateCombo.dispatchEvent(new Event("change", { bubbles: true }));

    expect(component.fetchAndUpdateDetailsElements.callCount).to.equal(1);
  });

  it("#fetchUpdatedSelectComponent calls fetch with the correct FormData values", async () => {
    sandbox.stub(window.FormData.prototype, "append");

    // Stub out fetch, so that it does nothing
    global.fetch.resolves(new Response("", { status: 200 }));

    // First value in the initialized  selector comboboxes.
    // See top level beforeEach()
    const expectedCounty = "1";
    const expectedState = "1";

    await component.fetchUpdatedSelectComponent();

    expect(
      window.FormData.prototype.append.calledWith(
        "county-select",
        expectedCounty,
      ),
    ).to.equal(true);
    expect(
      window.FormData.prototype.append.calledWith(
        "state-select",
        expectedState,
      ),
    ).to.equal(true);
  });

  it("if #fetchUpdatedSelectComponent response is ok, history is pushed", async () => {
    // Stub out fetch, so that it returns an OK response
    global.fetch.resolves(new Response("", { status: 200 }));

    // Stub the history pushState method
    sandbox.stub(window.history, "pushState");

    await component.fetchUpdatedSelectComponent();

    const expectedCountySelectValue = "1";
    const expectedHistoryURL = `/counties/ghwo/${expectedCountySelectValue}`;

    expect(
      window.history.pushState.calledWith(
        {},
        expectedCountySelectValue,
        expectedHistoryURL,
      ),
    ).to.equal(true);
  });

  it("if #fetchUpdatedSelectComponent response is ok, adds the popstate handler for back button", async () => {
    // Stub out fetch, so that it returns an OK response
    global.fetch.resolves(new Response("", { status: 200 }));

    // Stub adding the event listener to the window
    // object
    sandbox.stub(window, "addEventListener");

    await component.fetchUpdatedSelectComponent();

    expect(
      window.addEventListener.calledWith(
        "popstate",
        component.handleBackButton,
      ),
    ).to.equal(true);
  });

  it("Appends the loader to the DOM if the request is taking longer than the timeout", async () => {
    // Mock the fetch call so it takes longer than the timeout
    // to respond
    global.fetch.callsFake(async () => {
      await wait(WX_GHWO_DETAILS_LOADER_TIMEOUT + 500);
      return new Response("", { status: 200 });
    });

    const component = document.querySelector("wx-ghwo-selector");
    const currentCounty = component.countyCombobox.getAttribute("selected");
    const detailsElement = document.querySelector("[wx-ghwo-details]");
    detailsElement.setAttribute("wx-ghwo-details", currentCounty);
    const template = document.querySelector("template");
    const templateSpy = sandbox.spy(template.content, "cloneNode");

    // Dispatch the change event to trigger fetching county details
    component.fetchAndUpdateDetailsElements();

    // Wait for the actual timeout (plus a teensy bit extra)
    await wait(WX_GHWO_DETAILS_LOADER_TIMEOUT + 20);
    const loader = document.getElementById("loader");
    expect(templateSpy.callCount).to.equal(1);

    expect(loader).to.exist;
  });

  it("Does not append the loader to the DOM at all if the request responds _before_ the timeout", async () => {
    // Mock the detch call so it returns in a shorter period than
    // the timeout
    global.fetch.callsFake(async () => {
      await wait(WX_GHWO_DETAILS_LOADER_TIMEOUT - 300);
      return new Response("", { status: 200 });
    });

    const component = document.querySelector("wx-ghwo-selector");
    const currentCounty = component.countyCombobox.getAttribute("selected");
    const detailsElement = document.querySelector("[wx-ghwo-details]");
    detailsElement.setAttribute("wx-ghwo-details", currentCounty);
    const template = document.querySelector("template");
    const templateSpy = sandbox.spy(template.content, "cloneNode");

    // Dispatch the change event to trigger fetching county details
    component.fetchAndUpdateDetailsElements();

    // We expect that the template was never cloned
    await wait(WX_GHWO_DETAILS_LOADER_TIMEOUT + 100);
    const loader = document.getElementById("loader");

    expect(loader).to.not.exist;
    expect(templateSpy.callCount).to.equal(0);
  });
});
