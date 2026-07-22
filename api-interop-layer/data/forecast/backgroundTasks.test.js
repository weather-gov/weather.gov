import sinon from "sinon";
import { expect } from "chai";

import { flushForecastGridLogs } from "./backgroundTasks.js";

describe("Forecast Background Tasks Tests", () => {
  let queryStub;
  let mockDb;
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    queryStub = sandbox.stub().resolves({ rowCount: 0, rows: [] });
    mockDb = { query: queryStub };
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("flushForecastGridLogs()", () => {
    it("should call the database query during ingestion", async () => {
      const batch = [{ wfo: "TOP", x: 1, y: 1 }];
      await flushForecastGridLogs(mockDb, batch);
      expect(queryStub.calledOnce).to.be.true;
    });

    it("should execute the SQL with batch data", async () => {
      const batch = [
        {
          wfo: "LOX",
          x: 155,
          y: 45,
          geometry: { type: "Point", coordinates: [1, 2] },
        },
      ];

      await flushForecastGridLogs(mockDb, batch);

      expect(queryStub.calledOnce).to.be.true;
      const [sql] = queryStub.getCall(0).args;
      expect(sql).to.contain("INSERT INTO weathergov_ndfd_gridpoints");
    });

    it("should handle a large batch of 500 hits", async () => {
      const largeBatch = Array.from({ length: 500 }, (_, i) => ({
        wfo: i % 2 === 0 ? "LWX" : "TOP",
        x: i,
        y: i,
        geometry: { type: "Point", coordinates: [-77, 38] },
      }));

      await flushForecastGridLogs(mockDb, largeBatch);
      expect(queryStub.calledOnce).to.be.true;
    });
  });
});
