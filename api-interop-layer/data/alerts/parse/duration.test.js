import { expect } from "chai";
import dayjs from "dayjs";
import sinon from "sinon";
import { parseDuration } from "./duration.js";

describe("alert parsing > duration", () => {
  let clock;

  before(() => {
    clock = sinon.useFakeTimers();
  });

  beforeEach(() => {
    clock.reset();
  });

  after(() => {
    clock.restore();
  });

  describe("for alerts whose onset is in the past", () => {
    it("ending later today", () => {
      const now = dayjs("2024-09-01T08:00:00-05:00");
      clock.tick(now.valueOf());
      const onset = now.subtract(2, "hours");
      const finish = now.add(2, "hours");

      const duration = parseDuration({ onset, finish }, "America/Chicago");
      expect(duration).to.equal("until 10:00 AM today");
    });

    it("ending after today", () => {
      const now = dayjs("2024-09-01T08:00:00-05:00");
      clock.tick(now.valueOf());
      const onset = now.subtract(2, "hours");
      const finish = now.add(2, "hours").add(1, "day");

      const duration = parseDuration({ onset, finish }, "America/Chicago");
      expect(duration).to.equal("until Monday 09/02 10:00 AM CDT");
    });

    it("with unknown ending", () => {
      const now = dayjs("2024-09-01T08:00:00-05:00");
      clock.tick(now.valueOf());
      const onset = now.subtract(2, "hours");

      const duration = parseDuration({ onset }, "America/Chicago");
      expect(duration).to.equal("is in effect");
    });

    it("already ended", () => {
      const now = dayjs("2024-09-01T08:00:00-05:00");
      clock.tick(now.valueOf());
      const onset = now.subtract(2, "hours");
      const finish = now.subtract(1, "hour");

      const duration = parseDuration({ onset, finish }, "America/Chicago");
      expect(duration).to.equal("has concluded");
    });
  });

  describe("for alerts that have not yet started", () => {
    const now = dayjs("2024-09-01T08:00:00-05:00");
    beforeEach(() => {
      clock.tick(now.valueOf());
    });

    describe("starting later today", () => {
      it("starts in the morning", () => {
        const onset = now.add(1, "hour");

        const duration = parseDuration({ onset }, "America/Chicago");

        expect(duration).to.equal("this morning");
      });

      it("starts in the afternoon", () => {
        const onset = now.add(6, "hours");

        const duration = parseDuration({ onset }, "America/Chicago");

        expect(duration).to.equal("this afternoon");
      });

      it("starts in the night", () => {
        const onset = now.add(12, "hours");

        const duration = parseDuration({ onset }, "America/Chicago");

        expect(duration).to.equal("tonight");
      });
    });

    describe("starting tomorrow", () => {
      it("starts in the morning", () => {
        const onset = now.add(1, "day");

        const duration = parseDuration({ onset }, "America/Chicago");

        expect(duration).to.equal("tomorrow morning");
      });

      it("starts in the afternoon", () => {
        const onset = now.add(1, "day").add(6, "hours");

        const duration = parseDuration({ onset }, "America/Chicago");

        expect(duration).to.equal("tomorrow afternoon");
      });

      it("starts in the night", () => {
        const onset = now.add(1, "day").add(12, "hours");

        const duration = parseDuration({ onset }, "America/Chicago");

        expect(duration).to.equal("tomorrow night");
      });
    });

    it("starting in the further future", () => {
      const onset = now.add(2, "days");

      const duration = parseDuration({ onset }, "America/Chicago");

      expect(duration).to.equal("Tuesday");
    });
  });
});
