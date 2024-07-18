const {TWIG_T_FILTER_RX} = require("../translationExtraction.js");
const fs = require("fs");
const path = require("path");
let assert, expect, should;
import("chai").then((module) => {
  assert = module.assert;
  expect = module.expect;
  should = module.should;
});

describe("Twig t filter regex tests", () => {
  describe("Basic cases", () => {
    let source;
    before(() => {
      source = fs.readFileSync(path.resolve(__dirname, "fixtures", "t.filter.basic.twig")).toString();
    });

    it("Matches the correct number of translations", () => {
      const matches = Array.from(
        source.matchAll(TWIG_T_FILTER_RX)
      );

      expect(matches).to.have.lengthOf(3);
    });

    it("Matches the double quotes example", () => {
      const matches = Array.from(source.matchAll(TWIG_T_FILTER_RX));

      expect(matches[0][1]).to.equal("With double quotes");
    });

    it("Matches the single quotes example", () => {
      const matches = Array.from(source.matchAll(TWIG_T_FILTER_RX));

      expect(matches[1][1]).to.equal("With single quotes");
    });

    it("Matches the multiline string", () => {
      const matches = Array.from(source.matchAll(TWIG_T_FILTER_RX));

      expect(matches[2][1]).to.equal("Is potentially a multi\nline string");
    });
  });

  describe("Embedded HTML cases", () => {
    let source;
    before(() => {
      source = fs.readFileSync(path.resolve(__dirname, "fixtures", "t.filter.html.twig")).toString();
    });

    it("Has the correct number of matches", () => {
      const matches = Array.from(
        source.matchAll(TWIG_T_FILTER_RX)
      );

      expect(matches).to.have.lengthOf(2);
    });

    it("Matches the first example", () => {
      const matches = Array.from(
        source.matchAll(TWIG_T_FILTER_RX)
      );
      const expected = "chance of precipitation";
      const actual = matches[0][1];

      expect(actual).to.equal(expected);
    });

    it("MAtches the second example", () => {
      const matches = Array.from(
        source.matchAll(TWIG_T_FILTER_RX)
      );
      const expected = "Feels like";
      const actual = matches[1][1];

      expect(actual).to.equal(expected);
    });
  });
});
