describe("collect screenshots", () => {
  it("is not a test, is just a utility", () => {
    const pages = [
      { name: "front page", url: "/" },
      { name: "location page", url: "/local/OHX/50/57/Nashville" },
      { name: "login page", url: "/user/login" },
    ];

    for (const { name, url } of pages) {
      cy.visit(url);
      cy.get("html").invoke("css", "height", "initial");
      cy.get("body").invoke("css", "height", "initial");

      cy.viewport(480, 500);
      cy.screenshot(`phone/${name}`, { capture: "fullPage" });

      cy.viewport(640, 500);
      cy.screenshot(`tablet/${name}`, { capture: "fullPage" });

      cy.viewport(1024, 500);
      cy.screenshot(`desktop/${name}`, { capture: "fullPage" });
    }
  });
});
