import { createSandbox } from "sinon";
import { expect } from "chai";

describe("cms: collection quick add", () => {
  let sandbox;

  const getQuickAddButton = (label) =>
    Array.from(
      document.querySelectorAll(".collection-quick-add-panel button"),
    ).find((button) => button.textContent === label);

  beforeEach(async () => {
    sandbox = createSandbox();
    document.body.innerHTML = `
      <form action="/cms/images/multiple/add/" method="POST" enctype="multipart/form-data">
        <input name="csrfmiddlewaretoken" value="csrf-token">
            <div class="w-field__wrapper w-mx-auto w-mt-4 w-grid w-justify-center" data-field-wrapper="">
                <div class="w-field" data-field="">
                    <label class="w-field__input" data-field-input="">Add to collection:</label>
                    <div class="w-field__input">
                        <select id="id_addimage_collection" name="collection">
                        <option value="1">Root</option>
                        </select>
                    </div>
                </div>
            </div>
      </form>`;

    await import(
      `../../../assets/js/cms/collection-quick-add.js?cache-buster=${Math.random()}` // nosemgrep
    );
    document.dispatchEvent(new Event("DOMContentLoaded"));
  });

  afterEach(() => {
    sandbox.restore();
    document.body.innerHTML = "";
  });

  it("adds a collection and selects it", async () => {
    global.fetch.resolves({
      ok: true,
      json: async () => ({ id: "2", label: "New collection" }),
    });

    document.querySelector(".collection-quick-add-toggle").click();
    const input = document.querySelector(".collection-quick-add-panel input");
    input.value = "New collection";
    getQuickAddButton("Add").click();
    const clock = sandbox.useFakeTimers();
    await clock.runAllAsync();

    expect(global.fetch.calledOnce).to.be.true;
    expect(global.fetch.firstCall.args[0]).to.equal(
      "/cms/image-tree/add-collection/",
    );
    expect(global.fetch.firstCall.args[1].headers["X-CSRFToken"]).to.equal(
      "csrf-token",
    );
    expect(global.fetch.firstCall.args[1].body).to.equal(
      "name=New%20collection&parent_id=1",
    );
    expect(document.querySelector("#id_addimage_collection").value).to.equal(
      "2",
    );
    expect(document.querySelector(".collection-quick-add-panel").hidden).to.be
      .true;
  });

  it("reports a missing collection name without submitting", () => {
    document.querySelector(".collection-quick-add-toggle").click();
    getQuickAddButton("Add").click();

    const error = document.querySelector(".collection-quick-add-error");
    expect(global.fetch.called).to.be.false;
    expect(error.hidden).to.be.false;
    expect(error.textContent).to.equal("Please enter a name.");
  });
});
