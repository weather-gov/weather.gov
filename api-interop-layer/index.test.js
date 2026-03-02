import { expect } from "chai";
import quibble from "quibble";
import sinon from "sinon";

describe("main bootstrapper", () => {
  const sandbox = sinon.createSandbox();

  const server = {
    get: sandbox.spy(),
    listen: sandbox.spy(),
    route: sandbox.spy(),
    setErrorHandler: sandbox.spy(),
  };
  const fastify = () => server;

  const startAlertProcessing = sandbox.spy();

  const handler = sandbox.stub();

  const urls = [
    {
      method: "FIRST",
      url: "/boo/boo",
      schema: true,
      // We'll test using this handler.
      handler,
    },
    {
      method: "second",
      url: "/and/yogi",
      schema: { an: "object" },
      // We won't use this handler, so it can just be whatever.
      handler: "a function",
    },
  ];

  let main;

  before(async () => {
    // Use quibble to mock out the ESM modules. The first argument is the import
    // path; the second argument are any named exports; the third argume is the
    // default argument. The default argument should *ALWAYS* be set, even if
    // it's just an empty argument.
    await quibble.esm("fastify", {}, fastify);
    await quibble.esm("./data/alerts/index.js", { startAlertProcessing }, {});
    await quibble.esm("./routes/index.js", {}, urls);

    // Now that we've mocked the dependency imports, we can import the code
    // under test.
    const index = await import("./index.js");
    main = index.main;
  });

  beforeEach(() => {
    sandbox.resetBehavior();
    sandbox.resetHistory();
  });

  after(async () => {
    // When we're done, restore all the imports so other tests don't get
    // confused by them.
    await quibble.reset();
  });

  describe("the bootstrap method", () => {
    // Do this before each since the sandbox gets reset before each test.
    beforeEach(async () => {
      await main();
    });

    it("sets up a global server error handler", () => {
      expect(server.setErrorHandler.called).to.be.true;
    });

    it("creates a root handler", () => {
      expect(server.get.calledWithMatch("/", sinon.match.func)).to.be.true;
    });

    describe("listens on the right port", () => {
      it("defaults to 8082", async () => {
        process.env.PORT = false;
        const { port, host } = server.listen.args[0][0];
        expect(+port).to.equal(8082);
        expect(host).to.equal("0.0.0.0");
      });

      it("uses PORT environment variable if set", async () => {
        sandbox.resetHistory();
        process.env.PORT = 9999;
        await main();
        const { port, host } = server.listen.args[0][0];
        expect(+port).to.equal(9999);
        expect(host).to.equal("0.0.0.0");
      });
    });

    it("starts the alert processing loop", () => {
      expect(startAlertProcessing.called).to.be.true;
    });

    it("hooks up routes as provided", () => {
      // We mocked in some routes, so we know exactly what to expect.

      expect(
        server.route.calledWithMatch({
          method: "FIRST",
          url: "/boo/boo",
          schema: true,

          // Note that this handler isn't the route handler. The route handlers
          // in the bootstrap are wrapped by a utility function that provides
          // route logging, newrelic logging, and performance timings. That
          // method is anonymous, so we'll just assert it's a function rather
          // than try to assert a specific one.
          handler: sinon.match.func,
        }),
      ).to.be.true;

      expect(
        server.route.calledWith({
          method: "second",
          url: "/and/yogi",
          schema: { an: "object" },
          handler: sinon.match.func,
        }),
      ).to.be.true;
    });
  });

  describe("root route", () => {
    it("just returns ok", async () => {
      await main();
      const response = { send: sinon.spy() };

      // We can get the subscribed route handler from the spy...
      const handler = server.get.args[0][1];
      // ...and then call it to ensure it behaves.
      await handler(null, response);

      expect(response.send.calledWith({ ok: true, index: "standalone" })).to.be
        .true;
    });
  });

  it("error handler sets a 500 and error message", async () => {
    await main();
    const errorHandler = server.setErrorHandler.args[0][0];

    const response = {
      status: sinon.stub(),
      send: sinon.stub(),
    };
    // Fastify responses are chained objects, so we should chain ours too
    // in case the code-under-test relies on that (which it does).
    response.status.returns(response);
    response.send.returns(response);

    await errorHandler(null, null, response);

    expect(response.status.calledWith(500)).to.be.true;
    expect(response.send.calledWith({ error: true })).to.be.true;
  });

  describe("route handlers", () => {
    // For these teses, we're only testing the utility wrapper behavior, not
    // the individual route handlers. Those should be tested independently.

    const request = {
      url: "https://test",
    };
    const response = {
      code: sandbox.spy(),
      send: sandbox.spy(),
    };
    let handlerWrapper;

    beforeEach(async () => {
      await main();
      handlerWrapper = server.route.args[0][0].handler;
    });

    it("sets the HTTP status code if provided", async () => {
      handler.resolves({ data: null, status: "over 9000" });

      await handlerWrapper(request, response);

      expect(response.code.calledWith("over 9000")).to.be.true;
    });

    it("sends back the data from the handler", async () => {
      handler.resolves({
        data: { timecode: "001100010010011110100001101101110011" },
      });

      await handlerWrapper(request, response);

      expect(
        response.send.calledWithMatch({
          timecode: "001100010010011110100001101101110011",
        }),
      ).to.be.true;
    });
  });
});
