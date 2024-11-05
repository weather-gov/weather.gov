import { expect } from "chai";
import { updateHighLowFromHourly } from "./index.js";
import dayjs from "../../util/day.js";

describe("updateHighLowFromHourly", () => {
  describe("Basic scenario", () => {
    const day = {
      periods: [
        {
          start: "2024-11-06T06:00:00.000Z",
          end: "2024-11-06T18:00:00.000Z",
          data: {
            probabilityOfPrecipitation: {
              degF: 99
            }
          }
        },
        {
          start: dayjs("2024-11-06T18:00:00.000Z"),
          end: dayjs("2024-11-07T06:00:00.000Z"),
          data: {
            probabilityOfPrecipitation: {
              degF: 99
            }
          }
        }
      ],
      hours: [
        {
          time: "2024-11-06T07:00:00.000Z",
            probabilityOfPrecipitation: {
              percent: 13
            }
        },
        {
          time: "2024-11-06T08:00:00.000Z",
          probabilityOfPrecipitation: {
            percent: 9
          }
        },
        {
          time: "2024-11-06T09:00:00.000Z",
          probabilityOfPrecipitation: {
            percent: 27
          }
        },
        // Should exclude the following
        {
          time: "2024-11-06T15:00:00.000Z",
          probabilityOfPrecipitation: {
            percent: 13
          }
        },
        {
          time: "2024-11-06T19:00:00.000Z",
          probabilityOfPrecipitation: {
            percent: 13
          }
        },
        {
          time: "2024-11-06T20:00:00.000Z",
          probabilityOfPrecipitation: {
            percent: 9
          }
        },
        {
          time: "2024-11-06T21:00:00.000Z",
          probabilityOfPrecipitation: {
            percent: 37
          }
        },
        // Should exclude the following
        {
          time: "2024-11-07T07:00:00.000Z",
          probabilityOfPrecipitation: {
            percent: 100
          }
        }
      ]
    };
    it("Can get the expected max PoP for the first period", () => {
      const expected = 25;
      const testDay = Object.assign({}, day);
      updateHighLowFromHourly(testDay);
      const actual = testDay.periods[0].data.probabilityOfPrecipitation.hourlyMax;

      expect(actual).to.eql(expected);
    });

    it("Can get the expected max PoP for the second period", () => {
      const expected = 35;
      const testDay = Object.assign({}, day);
      updateHighLowFromHourly(testDay);
      const actual = testDay.periods[1].data.probabilityOfPrecipitation.hourlyMax;

      expect(actual).to.eql(expected);
    });

    it("Can get the overall daily max PoP", () => {
      const expected = 35;
      const testDay = Object.assign({}, day);
      updateHighLowFromHourly(testDay);
      const actual = testDay.maxPop;

      expect(actual).to.equal(expected);
    });
  });
});
