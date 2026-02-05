import { expect } from "chai";
import { parseAPIIcon } from "./icon.js";

describe("icons", () => {
  it("returns null for invalid icon URLs", () => {
    const actual = parseAPIIcon("bob white");
    expect(actual).to.eql({ base: null, icon: null });
  });

  it("maps a standard icon correctly", () => {
    const actual = parseAPIIcon(
      "https://api.weather.gov/icons/land/day/sct?size=medium",
    );
    expect(actual).to.eql({
      icon: "mostly_clear-day.svg",
      base: "mostly_clear-day",
    });
  });

  it("maps a multi-condition icon correctly", () => {
    const actual = parseAPIIcon(
      "https://api.weather.gov/icons/land/day/sct/bkn?size=medium",
    );
    expect(actual).to.eql({
      icon: "mostly_clear-day.svg",
      base: "mostly_clear-day",
    });
  });
});
