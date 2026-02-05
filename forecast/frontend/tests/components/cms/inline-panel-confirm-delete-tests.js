import sinon from "sinon";
import { expect } from "chai";

describe("cms: confirm deleting items from inline panel", () => {
  const sandbox = sinon.createSandbox();

  // We want to be able to confirm whether or not the event
  // is canceled/suppressed/whatever.
  class ObservableEvent extends Event {
    preventDefault = sandbox.spy();
    stopPropagation = sandbox.spy();
  }

  global.confirm = sandbox.stub();

  beforeEach(async () => {
    // Re-import for each test using a cache-busting query parameter. Otherwise
    // the import cache will catch it and it won't re-run its initialiaation,
    // which is when it attaches the one-shot event handler.
    await import(
      `../../../assets/js/cms/inline-panel-confirm-delete.js?cache-buster=${Math.random()}`
    );

    sandbox.resetBehavior();
    sandbox.resetHistory();

    // Initialize the DOM to a super basic version of the inline panel.
    document.body.innerHTML = `
      <div data-wx-confirm-delete>
        <div class="w-panel__header">
          <button type="button" title="Delete"></button>
        </div>
      </div>`;

    // Fire the ready event. It is supposed to originate on the panel header,
    // so :make-it-so: :picard:. Ensure that it bubbles, though, because we are
    // listening to it on the document root, which is what the documentation
    // recommends doing.
    const target = document.querySelector(".w-panel__header");
    target.dispatchEvent(new Event("w-formset:ready", { bubbles: true }));
  });

  it("intercepts click events", () => {
    // The very most basic test, just verifies that when we click the button,
    // our event handler intercedes and calls the global confirm function.
    document.querySelector("button").click();
    expect(global.confirm.called).to.be.true;
  });

  it("stops processing if the user declines", () => {
    const event = new ObservableEvent("click");

    // Global confirm returns false, corresponding to the user deciding to
    // cancel the item deletion.
    global.confirm.returns(false);
    document.querySelector("button").dispatchEvent(event);

    // Verify that we did not cancel the event.
    expect(event.preventDefault.called).to.be.true;
    expect(event.stopPropagation.called).to.be.true;
  });

  it("continues processing if the user consents", () => {
    const event = new ObservableEvent("click");

    // Global confirm returns true, corresponding to the user deciding to
    // go ahead and delete that thing.
    global.confirm.returns(true);
    document.querySelector("button").dispatchEvent(event);

    // Verify that the event is, in fact, canceled.
    expect(event.preventDefault.called).to.be.false;
    expect(event.stopPropagation.called).to.be.false;
  });

  it("adds an event preemption if a new item is added", () => {
    // First, we'll add a new button to the DOM to represent the newly-created
    // item. We need to do that before firing the event or else the event won't
    // have anything to point to.
    const container = document.querySelector("div.w-panel__header");
    const newButton = document.createElement("button");
    newButton.setAttribute("type", "button");
    newButton.setAttribute("title", "Delete");
    container.append(newButton);

    // Now dispatch the event that the item was added. This event is triggered
    // from the wrapper element that contains the new item, so we'll do that too
    container.dispatchEvent(new Event("w-formset:added", { bubbles: true }));

    // Now click the button...
    newButton.click();

    // ...and confirm that the global confirm function was called. Ta-da!
    expect(global.confirm.called).to.be.true;
  });
});
