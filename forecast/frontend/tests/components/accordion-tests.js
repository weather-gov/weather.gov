import { expect } from "chai";

describe("wx accordion", () => {
  before(async () => {
    await import("../../assets/js/components/Accordion.js");
  });

  beforeEach(() => {
    document.body.innerHTML = `
      <wx-accordion>
        <button aria-expanded="true" aria-controls="target">beep</button>
        <template>boop</template>
      </wx-accordion>
      <div id="target">accordion content</div>
    `;
  });

  it("works", () => {
    const button = document.body.querySelector(
      "wx-accordion button[aria-expanded='false']",
    );
    const target = document.body.querySelector("#target");

    
    // Expand it
    button.click();
    expect(target.classList.contains("display-none")).to.be.false;
    expect(button.textContent).to.contain("beep");

    // Collapse it
    button.click();
    expect(target.classList.contains("display-none")).to.be.true;
    expect(button.textContent).to.contain("boop");

    // Expand it again
    button.click();
    expect(target.classList.contains("display-none")).to.be.false;
    expect(button.textContent).to.contain("beep");
  });
});
