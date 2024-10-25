import { expect } from "chai";
import { createSandbox } from "sinon";

describe("logging", () => {
  const sandbox = createSandbox();

  const consoleLog = sandbox.stub(console, "log");

  beforeEach(async () => {
    sandbox.resetHistory();
    sandbox.resetBehavior();
  });

  after(() => {
    console.log.restore(); // eslint-disable-line no-console
  });

  const loadLogger = async () => {
    // Import the module with cache-busting, so we can manipulate its load-time
    // behavior with environment variables.
    const module = await import(`./logging.js?${Date.now()}-${Math.random()}`);
    return module.createLogger;
  };

  describe("honors the log level from environment variable", () => {
    it("when set to verbose", async () => {
      process.env.LOG_LEVEL = "verbose";
      const createLogger = await loadLogger();

      const logger = createLogger("test");

      logger.verbose("message");
      logger.info("message");
      logger.warn("message");
      logger.error("message");

      expect(consoleLog.calledWith("[test] | verbose | message |")).to.be.true;
      expect(consoleLog.calledWith("[test] | info | message |")).to.be.true;
      expect(consoleLog.calledWith("[test] | warn | message |")).to.be.true;
      expect(consoleLog.calledWith("[test] | error | message |")).to.be.true;
    });

    it("when set to info", async () => {
      process.env.LOG_LEVEL = "info";
      const createLogger = await loadLogger();

      const logger = createLogger("test");

      logger.verbose("message");
      logger.info("message");
      logger.warn("message");
      logger.error("message");

      expect(consoleLog.calledWith("[test] | verbose | message |")).to.be.false;
      expect(consoleLog.calledWith("[test] | info | message |")).to.be.true;
      expect(consoleLog.calledWith("[test] | warn | message |")).to.be.true;
      expect(consoleLog.calledWith("[test] | error | message |")).to.be.true;
    });

    it("when set to warn", async () => {
      process.env.LOG_LEVEL = "warn";
      const createLogger = await loadLogger();

      const logger = createLogger("test");

      logger.verbose("message");
      logger.info("message");
      logger.warn("message");
      logger.error("message");

      expect(consoleLog.calledWith("[test] | verbose | message |")).to.be.false;
      expect(consoleLog.calledWith("[test] | info | message |")).to.be.false;
      expect(consoleLog.calledWith("[test] | warn | message |")).to.be.true;
      expect(consoleLog.calledWith("[test] | error | message |")).to.be.true;
    });

    it("when set to error", async () => {
      process.env.LOG_LEVEL = "error";
      const createLogger = await loadLogger();

      const logger = createLogger("test");

      logger.verbose("message");
      logger.info("message");
      logger.warn("message");
      logger.error("message");

      expect(consoleLog.calledWith("[test] | verbose | message |")).to.be.false;
      expect(consoleLog.calledWith("[test] | info | message |")).to.be.false;
      expect(consoleLog.calledWith("[test] | warn | message |")).to.be.false;
      expect(consoleLog.calledWith("[test] | error | message |")).to.be.true;
    });

    it("when set to silent", async () => {
      process.env.LOG_LEVEL = "silent";
      const createLogger = await loadLogger();

      const logger = createLogger("test");

      logger.verbose("message");
      logger.info("message");
      logger.warn("message");
      logger.error("message");

      expect(consoleLog.calledWith("[test] | verbose | message |")).to.be.false;
      expect(consoleLog.calledWith("[test] | info | message |")).to.be.false;
      expect(consoleLog.calledWith("[test] | warn | message |")).to.be.false;
      expect(consoleLog.calledWith("[test] | error | message |")).to.be.false;
    });

    it("when unset, defaults to info", async () => {
      process.env.LOG_LEVEL = "";
      const createLogger = await loadLogger();

      const logger = createLogger("test");

      logger.verbose("message");
      logger.info("message");
      logger.warn("message");
      logger.error("message");

      expect(consoleLog.calledWith("[test] | verbose | message |")).to.be.false;
      expect(consoleLog.calledWith("[test] | info | message |")).to.be.true;
      expect(consoleLog.calledWith("[test] | warn | message |")).to.be.true;
      expect(consoleLog.calledWith("[test] | error | message |")).to.be.true;
    });
  });

  it("logs objects", async () => {
    process.env.LOG_LEVEL = "verbose";
    const createLogger = await loadLogger();

    const logger = createLogger("test");

    logger.verbose({ an: "object" });

    expect(consoleLog.calledWith("[test] | verbose |")).to.be.true;
    expect(consoleLog.calledWith({ an: "object" })).to.be.true;
    expect(consoleLog.calledWith("|")).to.be.true;
  });
});
