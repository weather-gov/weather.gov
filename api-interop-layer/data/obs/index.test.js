import { expect } from "chai";
import sinon, { createSandbox } from "sinon";
import quibble from "quibble";
import { BASE_URL } from "../connectionPool.js";
import { parseTTLFromHeaders } from "../../redis.js";

describe("observations module", () => {
  const sandbox = createSandbox();

  // Mock the shared undici Pool instance
  const connectionPool = {
    request: sandbox.stub(),
  };

  const saveToRedis = sandbox.stub();
  const getFromRedis = sandbox.stub();

  const stations = {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: {
      text: sandbox.stub(),
      dump: sandbox.stub().resolves(),
    },
  };

  const response = {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: {
      text: sandbox.stub(),
      dump: sandbox.stub().resolves(),
    },
  };

  let getObservations;

  before(async () => {
    await quibble.esm("../connectionPool.js", {}, connectionPool);
    await quibble.esm(
      "../../redis.js",
      { saveToRedis, getFromRedis, parseTTLFromHeaders },
      {},
    );
    // Import the module now. Its dependency on the database will cause a hang
    // if we load it before the mocking is all setup. The reason is that the
    // database utility itself blocks until it can establish a connection.
    const module = await import("./index.js");
    getObservations = module.default;
  });

  beforeEach(() => {
    response.statusCode = 200;
    stations.statusCode = 200;

    stations.body.text.resolves(
      JSON.stringify({
        features: [
          {
            properties: {
              stationIdentifier: "station1",
              name: "Station #1",
              elevation: { unitCode: "wmoUnit:m", value: 49 },
            },
          },
          { properties: { stationIdentifier: "station2" } },
          { properties: { stationIdentifier: "station3" } },
        ],
      }),
    );

    connectionPool.request
      .withArgs(sinon.match({ path: `/gridpoints/TEST/1,1/stations?limit=3` }))
      .resolves(stations);

    // We need to specifically deal with all of these endpoints for every test
    // because the obs module automatically retries them if they fail. If we
    // don't make them, they'll reject. Most of the tests will still pass
    // because we're ultimately not relying on 2nd and 3rd stations, but they'll
    // possibly be slower as a result.
    connectionPool.request
      .withArgs(
        sinon.match({ path: `/stations/station1/observations?limit=1` }),
      )
      .resolves(response);
    connectionPool.request
      .withArgs(
        sinon.match({ path: `/stations/station2/observations?limit=1` }),
      )
      .resolves(response);
    connectionPool.request
      .withArgs(
        sinon.match({ path: `/stations/station3/observations?limit=1` }),
      )
      .resolves(response);

    // Note: we pass the globally mocked
    // database as the second param to the
    // getObservations call
    global.test.database.query.resolves({ rows: [{ distance: 100 }] });
  });

  after(async () => {
    sandbox.restore();
    await quibble.reset();
  });

  describe("properly handles feels-like temperature", () => {
    it("uses actual temperature if heat index and wind chill are empty", async () => {
      response.body.text.resolves(
        JSON.stringify({
          features: [
            {
              properties: {
                temperature: { value: 100, unitCode: "wmoUnit:degC" },
              },
            },
          ],
        }),
      );

      const expected = { degC: 100, degF: 212 };

      const obs = await getObservations(
        {
          grid: { wfo: "TEST", x: 1, y: 1 },
          point: {},
          place: { timezone: "America/New_York" },
        },
        global.test.database,
      );

      expect(obs.data.feelsLike).to.eql(expected);
    });

    it("uses heat index if present", async () => {
      response.body.text.resolves(
        JSON.stringify({
          features: [
            {
              properties: {
                temperature: { value: 100, unitCode: "wmoUnit:degC" },
                heatIndex: { value: 100, unitCode: "wmoUnit:degC" },
              },
            },
          ],
        }),
      );

      const expected = { degC: 100, degF: 212 };

      const obs = await getObservations(
        {
          grid: { wfo: "TEST", x: 1, y: 1 },
          point: {},
          place: { timezone: "America/New_York" },
        },
        global.test.database,
      );

      expect(obs.data.feelsLike).to.eql(expected);
    });

    it("uses wind chill if it is present and there is no heat index", async () => {
      response.body.text.resolves(
        JSON.stringify({
          features: [
            {
              properties: {
                temperature: { value: 100, unitCode: "wmoUnit:degC" },
                windChill: { value: 100, unitCode: "wmoUnit:degC" },
              },
            },
          ],
        }),
      );

      const expected = { degC: 100, degF: 212 };

      const obs = await getObservations(
        {
          grid: { wfo: "TEST", x: 1, y: 1 },
          point: {},
          place: { timezone: "America/New_York" },
        },
        global.test.database,
      );

      expect(obs.data.feelsLike).to.eql(expected);
    });
  });

  describe("properly handles null and zero wind", () => {
    it("preserves null if the wind is null", async () => {
      response.body.text.resolves(
        JSON.stringify({
          features: [
            {
              properties: {
                // Temperature is always required for a valid obs
                temperature: { value: 100, unitCode: "wmoUnit:degC" },
                windSpeed: {
                  unitCode: "wmoUnit:km_h-1",
                  value: null,
                },
              },
            },
          ],
        }),
      );

      const expected = { mph: null, "km/h": null };

      const obs = await getObservations(
        {
          grid: { wfo: "TEST", x: 1, y: 1 },
          point: {},
          place: { timezone: "America/New_York" },
        },
        global.test.database,
      );

      expect(obs.data.windSpeed).to.eql(expected);
    });

    it("preserves zero if the wind is zero", async () => {
      response.body.text.resolves(
        JSON.stringify({
          features: [
            {
              properties: {
                // Temperature is always required for a valid obs
                temperature: { value: 100, unitCode: "wmoUnit:degC" },
                windSpeed: {
                  unitCode: "wmoUnit:km_h-1",
                  value: 0,
                },
              },
            },
          ],
        }),
      );

      const expected = { mph: 0, "km/h": 0 };

      const obs = await getObservations(
        {
          grid: { wfo: "TEST", x: 1, y: 1 },
          point: {},
          place: { timezone: "America/New_York" },
        },
        global.test.database,
      );

      expect(obs.data.windSpeed).to.eql(expected);
    });
  });

  describe("handles errors", () => {
    describe("all observation stations return invalid data", () => {
      const features = [
        {
          properties: {
            temperature: { value: null, unitCode: "wmoUnit:degC" },
          },
        },
      ];
      const invalid = {
        statusCode: 200,
        headers: { "content-type": "application/json" },
        body: {
          text: sinon.stub().resolves(JSON.stringify({ features })),
          dump: sinon.stub().resolves(),
        },
      };

      it("tries the second observation if the first is invalid", async () => {
        connectionPool.request
          .withArgs(
            sinon.match({ path: `/stations/station1/observations?limit=1` }),
          )
          .resolves(invalid);

        connectionPool.request
          .withArgs(
            sinon.match({ path: `/stations/station2/observations?limit=1` }),
          )
          .resolves({
            statusCode: 200,
            headers: { "content-type": "application/json" },
            body: {
              text: sinon.stub().resolves(
                JSON.stringify({
                  features: [
                    {
                      properties: {
                        temperature: { value: 50, unitCode: "wmoUnit:degC" },
                      },
                    },
                  ],
                }),
              ),
              dump: sinon.stub().resolves(),
            },
          });

        const expected = { degC: 50, degF: 122 };

        const obs = await getObservations(
          {
            grid: { wfo: "TEST", x: 1, y: 1 },
            point: {},
            place: { timezone: "America/New_York" },
          },
          global.test.database,
        );

        expect(obs.data.temperature).to.eql(expected);
      });

      it("tries the third observation if the second is invalid", async () => {
        connectionPool.request
          .withArgs(
            sinon.match({ path: `/stations/station1/observations?limit=1` }),
          )
          .resolves(invalid);

        connectionPool.request
          .withArgs(
            sinon.match({ path: `/stations/station2/observations?limit=1` }),
          )
          .resolves(invalid);

        connectionPool.request
          .withArgs(
            sinon.match({ path: `/stations/station3/observations?limit=1` }),
          )
          .resolves({
            statusCode: 200,
            headers: { "content-type": "application/json" },
            body: {
              text: sinon.stub().resolves(
                JSON.stringify({
                  features: [
                    {
                      properties: {
                        temperature: { value: 25, unitCode: "wmoUnit:degC" },
                      },
                    },
                  ],
                }),
              ),
              dump: sinon.stub().resolves(),
            },
          });

        const expected = { degC: 25, degF: 77 };

        const obs = await getObservations(
          {
            grid: { wfo: "TEST", x: 1, y: 1 },
            point: {},
            place: { timezone: "America/New_York" },
          },
          global.test.database,
        );

        expect(obs.data.temperature).to.eql(expected);
      });

      describe("returns an error if all observations are invalid", () => {
        it("all stations return invalid observations", async () => {
          connectionPool.request
            .withArgs(
              sinon.match({ path: `/stations/station1/observations?limit=1` }),
            )
            .resolves(invalid);

          connectionPool.request
            .withArgs(
              sinon.match({ path: `/stations/station2/observations?limit=1` }),
            )
            .resolves(invalid);

          connectionPool.request
            .withArgs(
              sinon.match({ path: `/stations/station3/observations?limit=1` }),
            )
            .resolves(invalid);

          const expected = {
            error: true,
            message: "No valid observations found",
          };

          const obs = await getObservations(
            {
              grid: { wfo: "TEST", x: 1, y: 1 },
              point: {},
              place: { timezone: "America/New_York" },
            },
            global.test.database,
          );

          expect(obs).to.eql(expected);
        });

        it("all stations return no observations", async () => {
          const originalFeatures = [...features];
          features.length = 0;

          connectionPool.request
            .withArgs(
              sinon.match({ path: `/stations/station1/observations?limit=1` }),
            )
            .resolves(invalid);

          connectionPool.request
            .withArgs(
              sinon.match({ path: `/stations/station2/observations?limit=1` }),
            )
            .resolves(invalid);

          connectionPool.request
            .withArgs(
              sinon.match({ path: `/stations/station3/observations?limit=1` }),
            )
            .resolves(invalid);

          const expected = {
            error: true,
            message: "No valid observations found",
          };

          const obs = await getObservations(
            {
              grid: { wfo: "TEST", x: 1, y: 1 },
              point: {},
              place: { timezone: "America/New_York" },
            },
            global.test.database,
          );

          expect(obs).to.eql(expected);

          features.push(...originalFeatures);
        });
      });
    });

    it("returns an error if none of the stations return", async () => {
      connectionPool.request
        .withArgs(
          sinon.match({ path: `/stations/station1/observations?limit=1` }),
        )
        .resolves({ statusCode: 400 });
      connectionPool.request
        .withArgs(
          sinon.match({ path: `/stations/station2/observations?limit=1` }),
        )
        .resolves({ statusCode: 400 });
      connectionPool.request
        .withArgs(
          sinon.match({ path: `/stations/station3/observations?limit=1` }),
        )
        .resolves({ statusCode: 400 });

      const expected = {
        error: true,
        message: "No valid observations found",
      };

      const actual = await getObservations(
        {
          grid: { wfo: "TEST", x: 1, y: 1 },
          point: {},
          place: { timezone: "America/New_York" },
        },
        global.test.database,
      );

      expect(actual).to.eql(expected);
    });

    it("returns an error if getting the list of stations fails", async () => {
      connectionPool.request
        .withArgs(
          sinon.match({ path: `/gridpoints/TEST/1,1/stations?limit=3` }),
        )
        .rejects();

      const expected = {
        error: true,
        message: "Failed to find an approved observation station",
      };

      const actual = await getObservations(
        {
          grid: { wfo: "TEST", x: 1, y: 1 },
          point: {},
          place: { timezone: "America/New_York" },
        },
        global.test.database,
      );

      expect(actual).to.eql(expected);
    });

    it("returns an error if the list of stations is zero", async () => {
      stations.body.text.resolves(JSON.stringify({ features: [] }));

      const expected = {
        error: true,
        message: "Failed to find an approved observation station",
      };

      const actual = await getObservations(
        {
          grid: { wfo: "TEST", x: 1, y: 1 },
          point: {},
          place: { timezone: "America/New_York" },
        },
        global.test.database,
      );

      expect(actual).to.eql(expected);
    });
  });

  it("handles the happy path, where everything is good", async () => {
    response.body.text.resolves(
      JSON.stringify({
        features: [
          {
            properties: {
              barometricPressure: { unitCode: "wmoUnit:Pa", value: 101800 },
              icon: `${BASE_URL}/icons/land/night/skc?size=medium`,
              textDescription: "Weathery",
              temperature: { value: 100, unitCode: "wmoUnit:degC" },
              timestamp: "2024-10-01T13:00:00-0500",
              windDirection: { unitCode: "wmoUnit:degree_(angle)", value: 260 },
              windSpeed: { unitCode: "wmoUnit:km_h-1", value: 37 },
            },
          },
        ],
      }),
    );

    const expected = {
      description: "Weathery",
      icon: {
        base: "clear-night",
        icon: "clear-night.svg",
      },
      station: {
        distance: { ft: 328, m: 100, mi: 0 },
        elevation: { ft: 161, m: 49, mi: 0 },
        id: "station1",
        name: "Station #1",
      },
      data: {
        barometricPressure: {
          inHg: 30.06,
          mb: 1018,
          pa: 101800,
        },
        feelsLike: { degC: 100, degF: 212 },
        temperature: { degC: 100, degF: 212 },
        windDirection: {
          cardinalLong: "west",
          cardinalShort: "W",
          degrees: 260,
        },
        windSpeed: {
          "km/h": 37,
          mph: 23,
        },
      },
      // Note that this does *NOT* match the input value. This is because the
      // timezone passed below is not UTC-05:00, it's UTC-04:00. This check
      // validates that we are setting the offset properly based on the timezone
      // of the requested location. The hour goes forward one and the offset goes
      // down one.
      timestamp: "2024-10-01T18:00:00.000Z",
    };

    const obs = await getObservations(
      {
        grid: { wfo: "TEST", x: 1, y: 1 },
        point: {},
      },
      global.test.database,
    );

    obs.timestamp = obs.timestamp.toISOString();

    expect(obs).to.eql(expected);
  });
});
