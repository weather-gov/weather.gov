import { expect } from "chai";
import { apiLogLevel } from "./logger.js";

describe("logger", () => {
  describe("apiLogLevel", () => {
    it("maps python level names to pino levels", () => {
      expect(apiLogLevel("CRITICAL")).to.equal("fatal");
      expect(apiLogLevel("ERROR")).to.equal("error");
      expect(apiLogLevel("WARNING")).to.equal("warn");
      expect(apiLogLevel("INFO")).to.equal("info");
      expect(apiLogLevel("DEBUG")).to.equal("debug");
    });

    it("passes pino level names through", () => {
      for (const level of [
        "fatal",
        "error",
        "warn",
        "info",
        "debug",
        "trace",
        "silent",
      ]) {
        expect(apiLogLevel(level)).to.equal(level);
      }
    });

    it("defaults to info", () => {
      expect(apiLogLevel()).to.equal("info");
    });
  });
});
