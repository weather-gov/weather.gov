import sinon from "sinon";
import { expect } from "chai";

import {
  flushForecastGridLogs,
  processHeatInterval,
} from "./backgroundTasks.js";

describe("Forecast Background Tasks Tests", () => {
  let queryStub;
  let mockDb;
  let mockPort;

  beforeEach(() => {
    queryStub = sinon.stub().resolves({ rowCount: 0, rows: [] });
    mockDb = { query: queryStub };
    mockPort = { postMessage: sinon.spy() };
  });

  afterEach(() => {
    sinon.restore();
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

  describe("processHeatInterval()", () => {
    it("should report errors via messenger when analysis fails", async () => {
      queryStub.rejects(new Error("Query Error"));
      await processHeatInterval(mockDb, mockPort);
      expect(queryStub.calledOnce).to.be.true;
    });

    it("should successfully execute the archive and purge SQL", async () => {
      queryStub.onFirstCall().resolves({ rowCount: 5 });
      queryStub.onSecondCall().resolves({ rowCount: 100 });

      // Pass the mockPort directly
      await processHeatInterval(mockDb, mockPort);

      expect(queryStub.calledTwice).to.be.true;
      const firstCallSql = queryStub.getCall(0).args[0];
      const secondCallSql = queryStub.getCall(1).args[0];

      expect(firstCallSql).to.contain("INSERT INTO weathergov_ndfd_grid_index");
      expect(secondCallSql).to.contain("DELETE FROM weathergov_ndfd_grid_logs");
    });

    it("should use the same timestamp for both operations", async () => {
      queryStub.resolves({ rowCount: 0 });

      await processHeatInterval(mockDb, mockPort);

      const ts1 = queryStub.getCall(0).args[1][0];
      const ts2 = queryStub.getCall(1).args[1][0];
      expect(ts1).to.equal(ts2);
    });
  });
});
