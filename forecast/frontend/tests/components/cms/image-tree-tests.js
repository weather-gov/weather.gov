import { expect } from "chai";

describe("cms: image tree", () => {
  const renderTree = () => {
    document.body.innerHTML = `
      <div class="tree-container">
        <ul class="tree-branch">
          <li class="tree-node">
            <div class="folder-row">
              <button type="button" class="folder-title" aria-controls="folder-1" aria-expanded="false">
                <span class="folder-name">Folder one</span>
              </button>
              <div class="folder-menu">
                <button type="button" class="folder-menu-toggle" aria-controls="folder-menu-1" aria-expanded="false">Menu</button>
                <div id="folder-menu-1" class="folder-menu-popup" hidden>
                  <button type="button" class="folder-menu-item add-collection-toggle" aria-controls="add-collection-1" aria-expanded="false">Add sub-collection</button>
                </div>
              </div>
            </div>
            <form id="add-collection-1" class="add-collection-form" hidden></form>
            <div id="folder-1" class="folder-contents" hidden></div>
          </li>
          <li class="tree-node">
            <div class="folder-row">
              <button type="button" class="folder-title" aria-controls="folder-2" aria-expanded="false">
                <span class="folder-name">Folder two</span>
              </button>
              <div class="folder-menu">
                <button type="button" class="folder-menu-toggle" aria-controls="folder-menu-2" aria-expanded="true">Open menu</button>
                <div id="folder-menu-2" class="folder-menu-popup"></div>
              </div>
            </div>
            <div id="folder-2" class="folder-contents" hidden></div>
          </li>
        </ul>
      </div>`;
  };

  beforeEach(() => {
    sessionStorage.clear();
    renderTree();
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("expands and collapses a folder", async () => {
    await import(
      `../../../assets/js/cms/image-tree.js?cache-buster=${Math.random()}` // nosemgrep
    );

    const toggle = document.querySelector(".folder-title");
    const contents = document.querySelector("#folder-1");
    toggle.click();
    expect(toggle.getAttribute("aria-expanded")).to.equal("true");
    expect(contents.hidden).to.be.false;

    toggle.click();
    expect(toggle.getAttribute("aria-expanded")).to.equal("false");
    expect(contents.hidden).to.be.true;
  });

  it("opens one actions menu and closes the other", async () => {
    await import(
      `../../../assets/js/cms/image-tree.js?cache-buster=${Math.random()}` // nosemgrep
    );

    document.querySelector('[aria-controls="folder-menu-1"]').click();

    expect(document.querySelector("#folder-menu-1").hidden).to.be.false;
    expect(document.querySelector("#folder-menu-2").hidden).to.be.true;
    expect(
      document
        .querySelector('[aria-controls="folder-menu-2"]')
        .getAttribute("aria-expanded"),
    ).to.equal("false");
  });

  it("expands ancestors and focuses a newly-created collection", async () => {
    document.body.innerHTML = `
      <div class="tree-container">
        <ul class="tree-branch">
          <li class="tree-node">
            <div class="folder-row">
              <button class="folder-title" aria-expanded="false">Parent</button>
            </div>
            <div class="folder-contents" hidden>
              <ul class="tree-branch">
                <li class="tree-node">
                  <div id="folder-2" class="folder-contents" hidden></div>
                </li>
              </ul>
            </div>
          </li>
        </ul>
      </div>`;
    sessionStorage.setItem("imageTreeFocusCollectionId", "2");

    await import(
      `../../../assets/js/cms/image-tree.js?cache-buster=${Math.random()}` // nosemgrep
    );

    expect(document.querySelector(".folder-contents").hidden).to.be.false;
    expect(
      document.querySelector(".folder-title").getAttribute("aria-expanded"),
    ).to.equal("true");
    expect(
      document
        .querySelector("#folder-2")
        .parentElement.classList.contains("tree-node-highlight"),
    ).to.be.true;
    expect(sessionStorage.getItem("imageTreeFocusCollectionId")).to.be.null;
  });
});
