import { expect } from "chai";
import dayjs from "dayjs";
import sinon, { createSandbox } from "sinon";
import AFDParser from "./AFDParser.js";

describe("AFDParser Tests", () => {

  describe("Static helper tests", () => {
    describe("#normalizeSpaces", () => {
      it("compresses consecutive spaces to single spaces in simple example", () => {
        const example = "this    word   has  multiple spaces  between     others   ";
        const expected = "this word has multiple spaces between others ";
        const actual = AFDParser.normalizeSpaces(example);

        expect(actual).to.equal(expected);
      });
    });

    describe("#splitIntoTopicSections", () => {
      it("can split into topic sections by && (from directive)", () => {
        const example = "\n\n.SYNOPSIS...\nA slow moving cold front sags southeast into the area today, \nstalling nearby through tonight.\n\n&&\n\n.NEAR TERM /THROUGH TONIGHT/...\nA severe thunderstorm watch is in effect until 1100 PM EDT for \nportions of the lower Hudson Valley.\n\n&&\n\n";
        const expected = [
          ".SYNOPSIS...\nA slow moving cold front sags southeast into the area today, \nstalling nearby through tonight.\n\n",
          "\n.NEAR TERM /THROUGH TONIGHT/...\nA severe thunderstorm watch is in effect until 1100 PM EDT for \nportions of the lower Hudson Valley.\n\n"
        ];
        const actual = AFDParser.splitIntoTopicSections(example);

        expect(actual).to.eql(expected);
      });
    });
  });

  describe("Parser method tests", () => {
    describe("#parseDocumentPreamble", () => {
      it("can parse a basic example", () => {
        const example = "\n000\nFXUS61 KALY 051129\nAFDALY\n\nAREA FORECAST DISCUSSION\nNational Weather Service Albany NY\n729 AM EDT Thu Sep 5 2024\n\n.ANY HEADER HERE\n\nMore text here";
        const expectedNodes = [
          {
            type: "preambleCode",
            content: "000\nFXUS61 KALY 051129\nAFDALY"
          },
          {
            type: "preambleText",
            content: "AREA FORECAST DISCUSSION\nNational Weather Service Albany NY\n729 AM EDT Thu Sep 5 2024"
          }
        ];
        const expectedReturnValue = ".ANY HEADER HERE\n\nMore text here";
        const parser = new AFDParser(example);
        const actualReturnValue = parser.parseDocumentPreamble();
        const actualNodes = parser.parsedNodes;

        expect(actualNodes).to.eql(expectedNodes);
        expect(actualReturnValue).to.eql(expectedReturnValue);
      });
    });
  });

  describe("#parseHeader", () => {
    describe("WWA header", () => {
      const example = ".OKX WATCHES/WARNINGS/ADVISORIES...\nSomething else\nAnd more";
      it("parses a header node", () => {
        const parser = new AFDParser();
        parser.parseHeader(example);
        const expected = {
          type: "header",
          content: "OKX WATCHES/WARNINGS/ADVISORIES"
        };
        const actual = parser.parsedNodes.pop();

        expect(actual).to.eql(expected);
      });

      it("sets the correct content type on the parser", () => {
        const parser = new AFDParser();
        parser.parseHeader(example);
        const expected = "wwa";
        const actual = parser.contentType;

        expect(actual).to.eql(expected);
      });

      it("returns the correct substring", () => {
        const parser = new AFDParser();
        const expected = "\nSomething else\nAnd more";
        const actual = parser.parseHeader(example);

        expect(actual).to.eql(expected);
      });
    });

    describe("Temps/Pops", () => {
      const example = ".PRELIMINARY POINT TEMPS/POPS...";
      it("parses a header node", () => {
        const parser = new AFDParser();
        parser.parseHeader(example);
        const expected = {
          type: "header",
          content: "PRELIMINARY POINT TEMPS/POPS"
        };
        const actual = parser.parsedNodes.pop();

        expect(actual).to.eql(expected);
      });

      it("sets the correct content type", () => {
        const parser = new AFDParser();
        parser.parseHeader(example);
        const expected = "tempsTable";
        const actual = parser.contentType;

        expect(actual).to.eql(expected);
      });
    });    
  });
});
