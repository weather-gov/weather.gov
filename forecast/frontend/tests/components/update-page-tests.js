import { expect } from "chai";
import { update } from "../../assets/js/components/update-page.js";
import sinon from "sinon";

describe("page updater", () => {
  const sandbox = sinon.createSandbox();

  before(() => {
    // stub so we don't actually put the timer in the queue, otherwise the test
    // will never finish
    sandbox.stub(global, "setInterval");
  });

  beforeEach(() => {
    sandbox.reset();
  });

  after(() => {
    global.setInterval.restore();
  });

  it("starts an interval for updating at startup", () => {
    document.dispatchEvent(new Event("DOMContentLoaded"));
    expect(global.setInterval.calledWith(update, sinon.match.number)).to.be
      .true;
  });

  it("updates marked page components", async () => {
    global.document.body.innerHTML = `
      <div>
        This is not updated
      </div>
      <div>
        But my child is updated.
        <div wx-auto-update="two">Hello</div>
      </div>
      <div wx-auto-update="one">
        Also me
      </div>
    `;

    // Only answer the fetch if the ?update query parameter is added to whatever
    // the current location is. jsdom doesn't allow us to directly set the
    // location so we'll use whatever it defaults to.
    global.fetch.withArgs(`${global.window.location.href}?update=`).resolves({
      text: async () => `
        <div wx-auto-update="one">You too!</div>
        <div wx-auto-update="two">Goodbye</div>
        <div wx-auto-update="three">I don't go anywhere</div>
      `,
    });

    await update();

    expect(global.document.body.innerHTML).to.eql(`
      <div>
        This is not updated
      </div>
      <div>
        But my child is updated.
        <div wx-auto-update="two">Goodbye</div>
      </div>
      <div wx-auto-update="one">You too!</div>
    `);
  });
});
