import { expect } from "chai";
import dayjs from "dayjs";
import sinon, { createSandbox } from "sinon";

describe("observations module", () => {
  const sandbox = createSandbox();
  const stations = {
    status: 200,
    json: sandbox.stub(),
  };

  const response = {
    status: 200,
    json: sandbox.stub(),
  };

  let getObservations;

  before(async () => {
    // Import the module now. Its dependency on the database will cause a hang
    // if we load it before the mocking is all setup. The reason is that the
    // database utility itself blocks until it can establish a connection.
    const module = await import("./index.js");
    getObservations = module.default;
  });

  beforeEach(() => {
    response.status = 200;
    stations.response = 200;

    stations.json.resolves({
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
    });

    fetch
      .withArgs("https://api.weather.gov/gridpoints/TEST/1,1/stations")
      .resolves(stations);

    // We need to specifically deal with all of these endpoints for every test
    // because the obs module automatically retries them if they fail. If we
    // don't make them, they'll reject. Most of the tests will still pass
    // because we're ultimately not relying on 2nd and 3rd stations, but they'll
    // possibly be slower as a result.
    fetch
      .withArgs(
        "https://api.weather.gov/stations/station1/observations?limit=1",
      )
      .resolves(response);
    fetch
      .withArgs(
        "https://api.weather.gov/stations/station2/observations?limit=1",
      )
      .resolves(response);
    fetch
      .withArgs(
        "https://api.weather.gov/stations/station3/observations?limit=1",
      )
      .resolves(response);

    global.test.database.query.resolves([[{ distance: 100 }]]);
  });

  describe("properly handles feels-like temperature", () => {
    it("uses actual temperature if heat index and wind chill are empty", async () => {
      response.json.resolves({
        features: [
          {
            properties: {
              temperature: { value: 100, unitCode: "wmoUnit:degC" },
            },
          },
        ],
      });

      const expected = { degC: 100, degF: 212 };

      const obs = await getObservations({
        grid: { wfo: "TEST", x: 1, y: 1 },
        point: {},
      });

      expect(obs.data.feelsLike).to.eql(expected);
    });

    it("uses heat index if present", async () => {
      response.json.resolves({
        features: [
          {
            properties: {
              temperature: { value: 100, unitCode: "wmoUnit:degC" },
              heatIndex: { value: 100, unitCode: "wmoUnit:degC" },
            },
          },
        ],
      });

      const expected = { degC: 100, degF: 212 };

      const obs = await getObservations({
        grid: { wfo: "TEST", x: 1, y: 1 },
        point: {},
      });

      expect(obs.data.feelsLike).to.eql(expected);
    });

    it("uses wind chill if it is present and there is no heat index", async () => {
      response.json.resolves({
        features: [
          {
            properties: {
              temperature: { value: 100, unitCode: "wmoUnit:degC" },
              windChill: { value: 100, unitCode: "wmoUnit:degC" },
            },
          },
        ],
      });

      const expected = { degC: 100, degF: 212 };

      const obs = await getObservations({
        grid: { wfo: "TEST", x: 1, y: 1 },
        point: {},
      });

      expect(obs.data.feelsLike).to.eql(expected);
    });
  });

  describe("properly handles null and zero wind", () => {
    it("preserves null if the wind is null", async () => {
      response.json.resolves({
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
      });

      const expected = { mph: null, "km/h": null };

      const obs = await getObservations({
        grid: { wfo: "TEST", x: 1, y: 1 },
        point: {},
      });

      expect(obs.data.windSpeed).to.eql(expected);
    });

    it("preserves zero if the wind is zero", async () => {
      response.json.resolves({
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
      });

      const expected = { mph: 0, "km/h": 0 };

      const obs = await getObservations({
        grid: { wfo: "TEST", x: 1, y: 1 },
        point: {},
      });

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
        status: 200,
        json: sinon.stub().resolves({ features }),
      };

      it("tries the second observation if the first is invalid", async () => {
        fetch
          .withArgs(
            "https://api.weather.gov/stations/station1/observations?limit=1",
          )
          .resolves(invalid);

        fetch
          .withArgs(
            "https://api.weather.gov/stations/station2/observations?limit=1",
          )
          .resolves({
            status: 200,
            json: sinon.stub().resolves({
              features: [
                {
                  properties: {
                    temperature: { value: 50, unitCode: "wmoUnit:degC" },
                  },
                },
              ],
            }),
          });

        const expected = { degC: 50, degF: 122 };

        const obs = await getObservations({
          grid: { wfo: "TEST", x: 1, y: 1 },
          point: {},
        });

        expect(obs.data.temperature).to.eql(expected);
      });

      it("tries the third observation if the second is invalid", async () => {
        fetch
          .withArgs(
            "https://api.weather.gov/stations/station1/observations?limit=1",
          )
          .resolves(invalid);

        fetch
          .withArgs(
            "https://api.weather.gov/stations/station2/observations?limit=1",
          )
          .resolves(invalid);

        fetch
          .withArgs(
            "https://api.weather.gov/stations/station3/observations?limit=1",
          )
          .resolves({
            status: 200,
            json: sinon.stub().resolves({
              features: [
                {
                  properties: {
                    temperature: { value: 25, unitCode: "wmoUnit:degC" },
                  },
                },
              ],
            }),
          });

        const expected = { degC: 25, degF: 77 };

        const obs = await getObservations({
          grid: { wfo: "TEST", x: 1, y: 1 },
          point: {},
        });

        expect(obs.data.temperature).to.eql(expected);
      });

      describe("returns an error if all observations are invalid", () => {
        it("all stations return invalid observations", async () => {
          fetch
            .withArgs(
              "https://api.weather.gov/stations/station1/observations?limit=1",
            )
            .resolves(invalid);

          fetch
            .withArgs(
              "https://api.weather.gov/stations/station2/observations?limit=1",
            )
            .resolves(invalid);

          fetch
            .withArgs(
              "https://api.weather.gov/stations/station3/observations?limit=1",
            )
            .resolves(invalid);

          const expected = {
            error: true,
            message: "No valid observations found",
          };

          const obs = await getObservations({
            grid: { wfo: "TEST", x: 1, y: 1 },
            point: {},
          });

          expect(obs).to.eql(expected);
        });

        it("all stations return no observations", async () => {
          const originalFeatures = [...features];
          features.length = 0;

          fetch
            .withArgs(
              "https://api.weather.gov/stations/station1/observations?limit=1",
            )
            .resolves(invalid);

          fetch
            .withArgs(
              "https://api.weather.gov/stations/station2/observations?limit=1",
            )
            .resolves(invalid);

          fetch
            .withArgs(
              "https://api.weather.gov/stations/station3/observations?limit=1",
            )
            .resolves(invalid);

          const expected = {
            error: true,
            message: "No valid observations found",
          };

          const obs = await getObservations({
            grid: { wfo: "TEST", x: 1, y: 1 },
            point: {},
          });

          expect(obs).to.eql(expected);

          features.push(...originalFeatures);
        });
      });
    });

    it("returns an error if none of the stations return", async () => {
      fetch
        .withArgs(
          "https://api.weather.gov/stations/station1/observations?limit=1",
        )
        .resolves({ status: 400 });
      fetch
        .withArgs(
          "https://api.weather.gov/stations/station2/observations?limit=1",
        )
        .resolves({ status: 400 });
      fetch
        .withArgs(
          "https://api.weather.gov/stations/station3/observations?limit=1",
        )
        .resolves({ status: 400 });

      const expected = {
        error: true,
        message: "No valid observations found",
      };

      const actual = await getObservations({
        grid: { wfo: "TEST", x: 1, y: 1 },
        point: {},
      });

      expect(actual).to.eql(expected);
    });

    it("returns an error if getting the list of stations fails", async () => {
      fetch
        .withArgs("https://api.weather.gov/gridpoints/TEST/1,1/stations")
        .rejects();

      const expected = {
        error: true,
        message: "Failed to find an approved observation station",
      };

      const actual = await getObservations({
        grid: { wfo: "TEST", x: 1, y: 1 },
        point: {},
      });

      expect(actual).to.eql(expected);
    });

    it("returns an error if the list of stations is zero", async () => {
      stations.json.resolves({ features: [] });

      const expected = {
        error: true,
        message: "Failed to find an approved observation station",
      };

      const actual = await getObservations({
        grid: { wfo: "TEST", x: 1, y: 1 },
        point: {},
      });

      expect(actual).to.eql(expected);
    });
  });

  it("handles the happy path, where everything is good", async () => {
    response.json.resolves({
      features: [
        {
          properties: {
            barometricPressure: { unitCode: "wmoUnit:Pa", value: 101800 },
            icon: "https://api.weather.gov/icons/land/night/skc?size=medium",
            textDescription: "Weathery",
            temperature: { value: 100, unitCode: "wmoUnit:degC" },
            timestamp: "2024-10-01T13:00:00-0500",
            windDirection: { unitCode: "wmoUnit:degree_(angle)", value: 260 },
            windSpeed: { unitCode: "wmoUnit:km_h-1", value: 37 },
          },
        },
      ],
    });

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
      timestamp: {
        formatted: "2024-10-01T13:00:00-0500",
        utc: dayjs("2024-10-01T13:00:00-0500"),
      },
    };

    const obs = await getObservations({
      grid: { wfo: "TEST", x: 1, y: 1 },
      point: {},
    });

    expect(obs).to.eql(expected);
  });
});
