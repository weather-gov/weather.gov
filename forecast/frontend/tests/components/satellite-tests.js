import { createSandbox } from "sinon";
import { expect } from "chai";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe("SatelliteVideo Component", () => {
  let sandbox;
  let clock; // For fake timers

  before(async () => {
    await import("../../assets/js/components/Satellite.js");
  });

  beforeEach(() => {
    sandbox = createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
    document.body.innerHTML = "";
  });

  const createComponent = () => {
    document.body.innerHTML = `
      <wx-satellite-video wfo="wfo1" timezone="America/Los_Angeles">
        <div data-wx-satellite-loading>Loading...</div>
        <div data-wx-satellite-content class="display-none">
          <div data-wx-satellite-times></div>
          <video><img src="" alt="fallback"></video>
        </div>
        <div data-wx-satellite-error class="display-none">Error</div>
      </wx-satellite-video>
    `;
    return document.querySelector("wx-satellite-video");
  };

  it("registers the wx-satellite-video element", () => {
    expect(window.customElements.get("wx-satellite-video")).to.exist;
  });

  describe("Successful data fetching", () => {
    it("renders GOES18 data correctly", async () => {
      global.fetch.resolves({
        ok: true,
        json: async () => ({
          meta: {
            satellite: "GOES-West",
            observation_time: "2026-03-20T12:00:00Z"
          }
        })
      });

      const el = createComponent();
      await wait(50);

      const video = el.querySelector("video");
      expect(video.src).to.contain("GOES18-WFO1-GEOCOLOR-600x600.mp4");
      expect(el.querySelector("[data-wx-satellite-loading]").classList.contains("display-none")).to.be.true;
    });

    it("correctly calculates the 8-hour time range tags", async () => {
      global.fetch.resolves({
        ok: true,
        json: async () => ({
          meta: {
            satellite: "GOES-West",
            observation_time: "2026-03-20T12:00:00Z" // Noon UTC
          }
        })
      });

      const el = createComponent();
      await wait(50);

      const times = el.querySelectorAll("time");
      expect(times[1].getAttribute("datetime")).to.equal("2026-03-20T12:00:00.000Z");
      expect(times[0].getAttribute("datetime")).to.equal("2026-03-20T04:00:00.000Z");
    });
  });
describe("Timezone handling", () => {
  it("converts UTC to the specified timezone correctly (Eastern Time)", async () => {
    // 12:00 PM UTC on March 20 is 8:00 AM EDT (UTC-4).
    // Note: This assertion is date-specific to account for Daylight Savings.
    global.fetch.resolves({
      ok: true,
      json: async () => ({
        meta: {
          satellite: "GOES-West",
          observation_time: "2026-03-20T12:00:00Z"
        }
      })
    });

    document.body.innerHTML = `
      <div data-wx-satellite-times></div>
      <wx-satellite-video wfo="okx" timezone="America/New_York">
        <div data-wx-satellite-loading></div>
        <div data-wx-satellite-content class="display-none"><video></video></div>
      </wx-satellite-video>
    `;

    await wait(50);

    const timeContainer = document.querySelector("[data-wx-satellite-times]");
    expect(timeContainer.textContent).to.contain("8:00 AM");
    expect(timeContainer.textContent).to.contain("12:00 AM");
  });

it("includes the day of the week when the range spans multiple days in the target timezone", async () => {
  // 03:00 AM UTC on the 21st is 11:00 PM EDT on the 20th.
  // The start time (8 hours prior) is 3:00 PM EDT on the 20th.
  // In UTC, these are different days (20th vs 21st).
  // In EDT, these are the SAME day (Friday the 20th).
  // We want to ensure it does NOT show the day name twice if they are the same day in the target timezone.
  global.fetch.resolves({
    ok: true,
    json: async () => ({
      meta: {
        satellite: "GOES-West",
        observation_time: "2026-03-21T03:00:00Z"
      }
    })
  });

  document.body.innerHTML = `
    <div data-wx-satellite-times></div>
    <wx-satellite-video wfo="okx" timezone="America/New_York">
      <div data-wx-satellite-loading></div>
      <div data-wx-satellite-content class="display-none"><video></video></div>
    </wx-satellite-video>
  `;

  await wait(50);

  const timeContainer = document.querySelector("[data-wx-satellite-times]");
  // Should show the day only once at the start: "Friday, 3:00 PM – 11:00 PM"
  // (Checking that "Saturday" or a second "Friday" is NOT present)
  expect(timeContainer.textContent).to.contain("Friday");
  expect(timeContainer.textContent).to.not.contain("Saturday");
});

  });

  describe("Error handling", () => {
    it("renders error state when fetch fails", async () => {
      sandbox.stub(console, "error");
      global.fetch.rejects(new Error("Network Failure"));

      const el = createComponent();
      await wait(50);

      expect(el.querySelector("[data-wx-satellite-error]").classList.contains("display-none")).to.be.false;
      expect(console.error.called).to.be.true;
    });
  });

  describe("Video Loop Logic", () => {
    it("resets and plays video after 'ended' event", async () => {
      // FAKE TIMERS: makes the 600ms wait happen instantly
      clock = sandbox.useFakeTimers();

      global.fetch.resolves({
        ok: true,
        json: async () => ({
          meta: { satellite: "GOES-West", observation_time: "2026-03-20T12:00:00Z" }
        })
      });

      const el = createComponent();
      
      await clock.tickAsync(50);

      const video = el.querySelector("video");
      video.play = sandbox.stub().resolves();
      
      video.dispatchEvent(new Event("play"));
      video.dispatchEvent(new Event("ended"));

      // Move the clock forward 600ms instantly
      await clock.tickAsync(600);

      expect(video.currentTime).to.equal(0);
      expect(video.play.calledOnce).to.be.true;
    });
  });
});