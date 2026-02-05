import sinon from "sinon";
import { expect } from "chai";
import { SPATIAL_PROJECTION } from "../../util/constants.js";
import { flushForecastGridLogs } from "./backgroundTasks.js";

describe("Forecast Background Tasks Tests", () => {
  let queryStub;
  let mockDb;

  beforeEach(() => {
    queryStub = sinon.stub().resolves({ rows: [] });
    mockDb = {
      query: queryStub,
    };
  });

  afterEach(() => {
    sinon.restore();
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

    const [sql, params] = queryStub.getCall(0).args;

    expect(sql).to.contain("WITH input_data AS");
    expect(sql).to.contain("INSERT INTO weathergov_ndfd_gridpoints");
    expect(sql).to.contain("INSERT INTO weathergov_ndfd_grid_logs");
    expect(sql).to.contain(
      `ST_SetSRID(ST_GeomFromGeoJson(geometry), ${SPATIAL_PROJECTION.WGS84})`,
    );

    const parsedParams = JSON.parse(params[0]);
    expect(parsedParams[0].wfo).to.equal("LOX");
  });

  it("should handle a large batch of 500 hits in a single SQL execution", async () => {
    const totalHits = 500;
    const largeBatch = [];

    // Generate 500 unique-ish grid points
    for (let i = 0; i < totalHits; i++) {
      largeBatch.push({
        wfo: i % 2 === 0 ? "LWX" : "TOP",
        x: i,
        y: i,
        geometry: { type: "Point", coordinates: [-77 + i / 100, 38 + i / 100] },
      });
    }

    await flushForecastGridLogs(mockDb, largeBatch);

    expect(queryStub.calledOnce).to.be.true;

    const [sql, params] = queryStub.getCall(0).args;
    const parsedParams = JSON.parse(params[0]);

    expect(parsedParams.length).to.equal(500);
    expect(parsedParams[499].x).to.equal(499);

    expect(sql).to.contain("INSERT INTO weathergov_ndfd_grid_logs");
  });

  it("should handle database errors gracefully", async () => {
    queryStub.rejects(new Error("DB Error"));

    // Function should catch the error and not rethrow
    try {
      await flushForecastGridLogs(mockDb, [{ wfo: "FAIL", x: 0, y: 0 }]);
    } catch {
      throw new Error("Function should have caught the error internally.");
    }

    expect(queryStub.calledOnce).to.be.true;
  });
});
