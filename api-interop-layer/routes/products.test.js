import sinon from "sinon";
import { expect } from "chai";
import quibble from "quibble";

describe("route: products", () => {
  let getProductById, products, sandbox;

  before(async () => {
    sandbox = sinon.createSandbox();
    getProductById = sandbox.stub();

    await quibble.esm("../data/index.js", { getProductById });

    products = await import("./products.js");
  });

  beforeEach(() => {
    sandbox.resetBehavior();
    sandbox.resetHistory();
  });

  after(async () => {
    sandbox.restore();
    await quibble.reset();
  });

  describe("exports required bits", () => {
    it("route method", () => {
      expect(products.method).to.equal("GET");
    });

    it("route url", () => {
      expect(products.url).to.equal("/products/:id");
    });

    it("route schema", () => {
      expect(products.schema).to.eql({
        params: {
          type: "object",
          properties: {
            id: {
              type: "string",
            },
          },
        },
      });
    });

    it("route handler", () => {
      expect(products.handler).to.be.instanceOf(Function);
    });
  });

  describe("the route handler", () => {
    it("returns an error, if there's an error", async () => {
      const request = { params: { id: "product id" } };
      getProductById.resolves({
        error: "No error",
        detail: "Everything is fine",
        status: 432,
      });

      const actual = await products.handler(request);

      expect(getProductById.calledWith("product id")).to.be.true;
      expect(actual).to.eql({
        status: 432,
        data: { error: "No error", detail: "Everything is fine", status: 432 },
        error: "Everything is fine",
      });
    });

    it("returns product data if everything is okay", async () => {
      const data = "quoth the raven";
      getProductById.resolves(data);
      const request = {
        params: { id: "nevermore" },
      };

      const actual = await products.handler(request);

      expect(getProductById.calledWith("nevermore")).to.be.true;
      expect(actual).to.eql({ data });
    });
  });
});
