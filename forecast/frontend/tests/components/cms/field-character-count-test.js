import { expect } from "chai";

describe("cms: field character count", () => {
  const treeSingleCount = `
    <div wx-char-counter>
      <textarea maxlength="20">hello</textarea>
    </div>`;

  const treeMultipleCount = `
    <div wx-char-counter>
      <textarea maxlength="20">hello</textarea>
    </div>
    <div wx-char-counter>
      <input type="text" maxlength="10" value="hi" />
    </div>`;

  const treeSingleWoMax = `
    <div wx-char-counter>
      <textarea>hello world</textarea>
    </div>`;

  const treeMultipleMix = `
    <div wx-char-counter>
      <textarea maxlength="20">hello</textarea>
    </div>
    <div wx-char-counter>
      <input type="text" value="hi" />
    </div>`;

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("adds the character count for text field", async () => {
    document.body.innerHTML = treeSingleCount;
    await import(
      `../../../assets/js/cms/field-character-count.js?cache-buster=${Math.random()}` // nosemgrep
    );
    document.dispatchEvent(new Event("DOMContentLoaded"));

    const wrapper = document.querySelector(".wx-char-count-wrapper");
    expect(wrapper).to.exist;
    expect(
      wrapper.querySelector(".wx-char-count-current").innerHTML,
    ).to.equal("5");
    expect(wrapper.querySelector(".wx-char-count-max").textContent).to.equal(
      "/20",
    );
  });

  it("adds the character count for multiple text fields", async () => {
    document.body.innerHTML = treeMultipleCount;
    await import(
      `../../../assets/js/cms/field-character-count.js?cache-buster=${Math.random()}` // nosemgrep
    );
    document.dispatchEvent(new Event("DOMContentLoaded"));

    const wrappers = document.querySelectorAll(".wx-char-count-wrapper");
    expect(wrappers.length).to.equal(2);
    expect(
      wrappers[0].querySelector(".wx-char-count-current").innerHTML,
    ).to.equal("5");
    expect(
      wrappers[0].querySelector(".wx-char-count-max").textContent,
    ).to.equal("/20");
    expect(
      wrappers[1].querySelector(".wx-char-count-current").innerHTML,
    ).to.equal("2");
    expect(
      wrappers[1].querySelector(".wx-char-count-max").textContent,
    ).to.equal("/10");
  });

  it("adds the character count without max length", async () => {
    document.body.innerHTML = treeSingleWoMax;
    await import(
      `../../../assets/js/cms/field-character-count.js?cache-buster=${Math.random()}` // nosemgrep
    );
    document.dispatchEvent(new Event("DOMContentLoaded"));

    const wrapper = document.querySelector(".wx-char-count-wrapper");
    expect(wrapper).to.exist;
    expect(
      wrapper.querySelector(".wx-char-count-current").innerHTML,
    ).to.equal("11");
    expect(wrapper.querySelector(".wx-char-count-max")).to.be.null;
  });

  it("adds the character count in mix of max length and with max length", async () => {
    document.body.innerHTML = treeMultipleMix;
    await import(
      `../../../assets/js/cms/field-character-count.js?cache-buster=${Math.random()}` // nosemgrep
    );
    document.dispatchEvent(new Event("DOMContentLoaded"));

    const wrappers = document.querySelectorAll(".wx-char-count-wrapper");
    expect(wrappers.length).to.equal(2);
    expect(
      wrappers[0].querySelector(".wx-char-count-max").textContent,
    ).to.equal("/20");
    expect(wrappers[1].querySelector(".wx-char-count-max")).to.be.null;
  });

  it("updates the current count when the field value changes", async () => {
    document.body.innerHTML = treeSingleCount;
    await import(
      `../../../assets/js/cms/field-character-count.js?cache-buster=${Math.random()}` // nosemgrep
    );
    document.dispatchEvent(new Event("DOMContentLoaded"));

    const textArea = document.querySelector("textarea");
    textArea.value = "hello there";
    textArea.dispatchEvent(new Event("input"));

    expect(
      document.querySelector(".wx-char-count-current").innerHTML,
    ).to.equal("11");
  });

  it("does not add a duplicate counter if one already exists", async () => {
    document.body.innerHTML = treeSingleCount;
    await import(
      `../../../assets/js/cms/field-character-count.js?cache-buster=${Math.random()}` // nosemgrep
    );
    document.dispatchEvent(new Event("DOMContentLoaded"));
    document.dispatchEvent(new Event("DOMContentLoaded"));

    expect(
      document.querySelectorAll(".wx-char-count-wrapper").length,
    ).to.equal(1);
  });

  it("adds a counter to a newly added formset item", async () => {
    document.body.innerHTML = "";
    await import(
      `../../../assets/js/cms/field-character-count.js?cache-buster=${Math.random()}` // nosemgrep
    );

    const container = document.createElement("div");
    container.setAttribute("wx-char-counter", "");
    container.innerHTML = `<textarea maxlength="15">abc</textarea>`;
    document.body.append(container);

    container.dispatchEvent(new Event("w-formset:added", { bubbles: true }));

    const wrapper = container.querySelector(".wx-char-count-wrapper");
    expect(wrapper).to.exist;
    expect(
      wrapper.querySelector(".wx-char-count-current").innerHTML,
    ).to.equal("3");
    expect(wrapper.querySelector(".wx-char-count-max").textContent).to.equal(
      "/15",
    );
  });
});
