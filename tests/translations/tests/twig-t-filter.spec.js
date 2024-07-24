const fs = require("fs");
const path = require("path");
const { matchTranslationFilters } = require("../translationExtraction.js");

let assert; let expect; let should;
import("chai").then((module) => {
  assert = module.assert;
  expect = module.expect;
  should = module.should;
});

describe("Twig translation regex tests", () => {
  describe("Basic cases", () => {
    let source;
    before(() => {
      source = fs
        .readFileSync(
          path.resolve(__dirname, "fixtures", "t.filter.basic.twig"),
        )
        .toString();
    });

    it("Matches the correct number of translations", () => {
      const matches = matchTranslationFilters(source);

      expect(matches).to.have.lengthOf(3);
    });

    it("Matches the double quotes example", () => {
      const matches = matchTranslationFilters(source);

      expect(matches[0][1]).to.equal("With double quotes");
    });

    it("Matches the single quotes example", () => {
      const matches = matchTranslationFilters(source);

      expect(matches[1][1]).to.equal("With single quotes");
    });

    it("Matches the multiline string", () => {
      const matches = matchTranslationFilters(source);

      expect(matches[2][1]).to.equal("Is potentially a multi\nline string");
    });
  });

  describe("Embedded HTML cases", () => {
    let source;
    before(() => {
      source = fs
        .readFileSync(path.resolve(__dirname, "fixtures", "t.filter.html.twig"))
        .toString();
    });

    it("Has the correct number of matches", () => {
      const matches = matchTranslationFilters(source);

      expect(matches).to.have.lengthOf(2);
    });

    it("Matches the first example", () => {
      const matches = matchTranslationFilters(source);
      const expected = "chance of precipitation";
      const actual = matches[0][1];

      console.log(actual);

      expect(actual).to.equal(expected);
    });

    it("Matches the second example", () => {
      const matches = matchTranslationFilters(source);
      const expected = "Feels like";
      const actual = matches[1][1];

      expect(actual).to.equal(expected);
    });
  });

  describe("Variable setting cases", () => {
    let source;
    before(() => {
      source = fs
        .readFileSync(path.resolve(__dirname, "fixtures", "t.variable.twig"))
        .toString();
    });

    it("Has the correct number of matches", () => {
      const matches = matchTranslationFilters(source);

      expect(matches).to.have.lengthOf(2);
    });

    it("Matches the first example", () => {
      const matches = matchTranslationFilters(source);
      const expected = "There was an error loading the current conditions.";
      const actual = matches[0][1];

      expect(actual).to.equal(expected);
    });

    it("Matches the second example", () => {
      const matches = matchTranslationFilters(source);
      const expected = "Overnight";
      const actual = matches[1][1];

      expect(actual).to.equal(expected);
    });
  });
});
