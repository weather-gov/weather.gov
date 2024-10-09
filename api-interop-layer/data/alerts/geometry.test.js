import sinon from "sinon";
import { expect } from "chai";
import * as mariadb from "mariadb";
import { generateAlertGeometry } from "./geometry.js";

describe("alert geometries", () => {
  const sandbox = sinon.createSandbox();
  const db = {
    query: sandbox.stub(),
    end: () => Promise.resolve(),
  };

  // Do this before everything, so it'll happen before any describe blocks run,
  // otherwise the connection creation won't be stubbed when the script is first
  // imported below.
  before(() => {
    mariadb.default.createConnection.resolves(db);
  });

  beforeEach(() => {
    sandbox.resetBehavior();
    sandbox.resetHistory();
  });

  it("returns an alert with a geometry as-is", async () => {
    const rawAlert = {
      geometry: "existing geometry",
    };

    const geometry = await generateAlertGeometry(db, rawAlert);
    expect(geometry).to.equal("existing geometry");
  });

  it("autogenerates a geometry from affected zones", async () => {
    const affectedZones = ["zone 1", "zone 2", "zone 3"];
    const rawAlert = {
      geometry: false,
      properties: {
        affectedZones,
      },
    };
    const query = `SELECT ST_ASGEOJSON(
        ST_SIMPLIFY(
          ST_SRID(
            ST_COLLECT(shape),
            0
          ),
          0.003
        )
      )
        AS shape
        FROM weathergov_geo_zones
        WHERE id IN (?,?,?)`;
    db.query.withArgs(sinon.match(query), sinon.match.same(affectedZones))
      .resolves([{ shape: { combined: "zones" } }]);

    const geometry = await generateAlertGeometry(db, rawAlert);
    expect(geometry).to.eql({ combined: "zones" });
  });

  it("autogenerates a geometry from same geocodes if no zones are present", async () => {
    const rawAlert = {
     geometry: false,
      properties: {
        geocode: {
          // SAME code is FIPS code with a leading zero. The leading
          // zero gets stripped out, so we need to include it here
          // so we get what we expect later.
          "SAME": ["0county 1", "0county 2", "0county 3"],
        },
      },
    };
    const query = `SELECT ST_ASGEOJSON(
        ST_SIMPLIFY(
          ST_SRID(
            ST_COLLECT(shape),
            0
          ),
          0.003
        )
      )
        AS shape
        FROM weathergov_geo_counties
        WHERE countyFips IN ('county 1','county 2','county 3')`;
    db.query.withArgs(sinon.match(query)).resolves([{ shape: { combined: "county" } }]);

    const geometry = await generateAlertGeometry(db, rawAlert);
    expect(geometry).to.eql({ combined: "county" });
  });

  it("returns null geometry if no zones or different geocodes are present", async () => {
    const rawAlert = {
      geometry: false,
      properties: {},
    };

    const geometry = await generateAlertGeometry(db, rawAlert);
    expect(geometry).to.be.null;
  });
});
