import { expect } from "chai";
import sinon from "sinon";
import dayjs from "../../util/day.js";
import {
  PACIFIC_STATIONS,
  fetchNearestStations,
  newestValidObservation,
} from "./pacificStations.js";

describe("pacific stations", () => {
  describe("newest valid observation", () => {
    const maxAge = 12 * 60 * 60 * 1000;

    it("skips observations with a null temperature", () => {
      const features = [
        {
          properties: {
            timestamp: dayjs().subtract(1, "hour").toISOString(),
            temperature: { value: null, unitCode: "wmoUnit:degC" },
          },
        },
        {
          properties: {
            timestamp: dayjs().subtract(2, "hour").toISOString(),
            temperature: { value: 28, unitCode: "wmoUnit:degC" },
          },
        },
      ];

      const expected = features[1].properties;
      const actual = newestValidObservation(features, maxAge);

      expect(actual).to.equal(expected);
    });

    it("skips observations older than the max age", () => {
      const features = [
        {
          properties: {
            timestamp: dayjs().subtract(13, "hour").toISOString(),
            temperature: { value: 28, unitCode: "wmoUnit:degC" },
          },
        },
      ];

      const actual = newestValidObservation(features, maxAge);

      expect(actual).to.be.undefined;
    });
  });

  describe("fetch nearest stations", () => {
    it("returns the stations in the order the database gives", async () => {
      global.test.database.query.withArgs(sinon.match(/unnest/)).resolves({
        rows: [{ idx: 5 }, { idx: 4 }, { idx: 6 }],
      });

      const expected = [
        PACIFIC_STATIONS[4],
        PACIFIC_STATIONS[3],
        PACIFIC_STATIONS[5],
      ];
      const actual = await fetchNearestStations(
        { latitude: 6.964, longitude: 158.206 },
        global.test.database,
      );

      expect(actual).to.eql(expected);
    });

    it("returns an error if no stations are inside the distance cap", async () => {
      global.test.database.query
        .withArgs(sinon.match(/unnest/))
        .resolves({ rows: [] });

      const expected = { error: true };
      const actual = await fetchNearestStations(
        { latitude: 1, longitude: 140 },
        global.test.database,
      );

      expect(actual).to.eql(expected);
    });
  });
});
