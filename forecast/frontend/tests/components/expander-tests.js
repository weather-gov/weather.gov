import { expect } from "chai";

describe("wx expander", () => {
  beforeEach(async () => {
    document.body.innerHTML = `
      <div wx-expander="#target">
        <button wx-expand>boop</button>
        <button wx-collapse>boop</button>
      </div>
      <div id="target" class="display-none"></div>
    `;

    await import("../../assets/js/components/expander.js");
  });

  it("works", () => {
    const expand = document.body.querySelector(
      "[wx-expander] button[wx-expand]",
    );
    const collapse = document.body.querySelector(
      "[wx-expander] button[wx-collapse]",
    );
    const target = document.body.querySelector("#target");

    // Expand it
    expand.click();
    expect(target.classList.contains("display-none"), "target is displayed").to
      .be.false;
    expect(expand.classList.contains("display-none"), "expand button is hidden")
      .to.be.true;
    expect(
      collapse.classList.contains("display-none"),
      "collapse button is displayed",
    ).to.be.false;

    // Collapse it
    collapse.click();
    expect(target.classList.contains("display-none"), "target is hidden").to.be
      .true;
    expect(
      expand.classList.contains("display-none"),
      "expand button is displayed",
    ).to.be.false;
    expect(
      collapse.classList.contains("display-none"),
      "collapse button is hidden",
    ).to.be.true;

    // Expand it again
    expand.click();
    expect(target.classList.contains("display-none"), "target is displayed").to
      .be.false;
    expect(expand.classList.contains("display-none"), "expand button is hidden")
      .to.be.true;
    expect(
      collapse.classList.contains("display-none"),
      "collapse button is displayed",
    ).to.be.false;
  });
});
