import { expect } from "chai";
import dayjs from "../../util/day.js";
import alertSort from "./sort.js";

describe("alert sorting", () => {
  describe("two alerts are currently active", () => {
    const onset = dayjs().subtract(1, "hour");
    it("if the first has higher priority, it is sorted above", () => {
      const expected = -1;
      const actual = alertSort(
        { onset, metadata: { priority: 0 } },
        { onset, metadata: { priority: 1 } },
      );

      expect(actual).to.equal(expected);
    });

    it("if the second has higher priority, it is sorted above", () => {
      const expected = 1;
      const actual = alertSort(
        { onset, metadata: { priority: 1 } },
        { onset, metadata: { priority: 0 } },
      );

      expect(actual).to.equal(expected);
    });

    describe("if they have the same priority", () => {
      it("if the first ends sooner, it is sorted above", () => {
        const expected = -1;
        const actual = alertSort(
          { onset, metadata: { priority: 1 }, finish: dayjs().add(1, "hour") },
          { onset, metadata: { priority: 1 }, finish: dayjs().add(2, "hour") },
        );

        expect(actual).to.equal(expected);
      });

      it("if the second ends sooner, it is sorted above", () => {
        const expected = 1;
        const actual = alertSort(
          { onset, metadata: { priority: 1 }, finish: dayjs().add(2, "hour") },
          { onset, metadata: { priority: 1 }, finish: dayjs().add(1, "hour") },
        );

        expect(actual).to.equal(expected);
      });

      it("if they end at the same time, they are not sorted", () => {
        const expected = 0;
        const actual = alertSort(
          { onset, metadata: { priority: 1 }, finish: dayjs().add(1, "hour") },
          { onset, metadata: { priority: 1 }, finish: dayjs().add(1, "hour") },
        );

        expect(actual).to.equal(expected);
      });
    });
  });

  describe("both alerts onset in the future", () => {
    const onset = dayjs().add(1, "hour");
    describe("the alerts onset at different times", () => {
      it("if the first begins first, it is sorted above", () => {
        const expected = -1;
        const actual = alertSort(
          { onset, metadata: {} },
          { onset: onset.add(1, "hour"), metadata: {} },
        );

        expect(actual).to.equal(expected);
      });

      it("if the second begins first, it is sorted above", () => {
        const expected = 1;
        const actual = alertSort(
          { onset: onset.add(1, "hour"), metadata: {} },
          { onset, metadata: {} },
        );

        expect(actual).to.equal(expected);
      });
    });

    describe("the alerts onset at the same time", () => {
      it("if the first has higher priority, it is sorted above", () => {
        const expected = -1;
        const actual = alertSort(
          { onset, metadata: { priority: 0 } },
          { onset, metadata: { priority: 1 } },
        );

        expect(actual).to.equal(expected);
      });

      it("if the second has higher priority, it is sorted above", () => {
        const expected = 1;
        const actual = alertSort(
          { onset, metadata: { priority: 1 } },
          { onset, metadata: { priority: 0 } },
        );

        expect(actual).to.equal(expected);
      });

      describe("if they have the same priority", () => {
        it("if the first ends sooner, it is sorted above", () => {
          const expected = -1;
          const actual = alertSort(
            {
              onset,
              metadata: { priority: 1 },
              finish: dayjs().add(1, "hour"),
            },
            {
              onset,
              metadata: { priority: 1 },
              finish: dayjs().add(2, "hour"),
            },
          );

          expect(actual).to.equal(expected);
        });

        it("if the second ends sooner, it is sorted above", () => {
          const expected = 1;
          const actual = alertSort(
            {
              onset,
              metadata: { priority: 1 },
              finish: dayjs().add(2, "hour"),
            },
            {
              onset,
              metadata: { priority: 1 },
              finish: dayjs().add(1, "hour"),
            },
          );

          expect(actual).to.equal(expected);
        });

        it("if they end at the same time, they are not sorted", () => {
          const expected = 0;
          const actual = alertSort(
            {
              onset,
              metadata: { priority: 1 },
              finish: dayjs().add(1, "hour"),
            },
            {
              onset,
              metadata: { priority: 1 },
              finish: dayjs().add(1, "hour"),
            },
          );

          expect(actual).to.equal(expected);
        });
      });
    });
  });
});
