import { expect } from "chai";
import { createSandbox } from "sinon";
import undici from "undici";
import getDataForWxStory from "./weatherstory.js";

describe("weatherstory module", () => {
  const sandbox = createSandbox();
  const response = {
    statusCode: 200,
    body: { json: sandbox.stub() },
  };

  beforeEach(() => {
    response.status = 200;
    undici.request.resolves(response);
  });

  describe("returns data if everything goes well", () => {
    it("for two stories", async () => {
      const stories = [
        {
            "id": "7ccab810-706b-401c-8757-71f656e56270",
            "officeId": "MPX",
            "startTime": "2026-01-01T12:00:00+00:00",
            "endTime": "2027-01-01T12:00:00+00:00",
            "updateTime": "2026-01-10T12:00:00+00:00",
            "title": "Testing the test",
            "description": "This is a triumph. I'm making a note here: huge success",
            "altText": "Alternative to text? Pictures!",
            "priority": false,
            "order": 1,
            "image": "http://localhost:8000/offices/MPX/weatherstories/7ccab810-706b-401c-8757-71f656e56270/image"
        },
        {
            "id": "d9cce8e6-a30e-41e3-b37e-165e1463ba54",
            "officeId": "MPX",
            "startTime": "2026-01-01T09:00:00+00:00",
            "endTime": "2027-01-01T12:00:00+00:00",
            "updateTime": "2026-01-10T12:00:00+00:00",
            "title": "No image",
            "description": "Womp womp",
            "altText": "Alternative to text? Pictures!",
            "priority": false,
            "order": 2,
            "image": "http://localhost:8000/offices/MPX/weatherstories/d9cce8e6-a30e-41e3-b37e-165e1463ba54/image"
        }
      ];
      response.body.json.resolves({
        "@context": {
            "@version": "1.1"
        },
        "stories": stories
      });
      const actual = await getDataForWxStory("ABC");

      expect(actual).to.deep.equal(stories);
    });

    it("for no stories", async () => {
      response.body.json.resolves({});
      const actual = await getDataForWxStory("ABC");

      expect(actual).to.deep.equal({ error: true });
    });
  });

  it("returns an error object if the weatherstory data is invalid", async () => {
    response.body.json.resolves({ nometa: {} });
    const actual = await getDataForWxStory("ABC");

    expect(actual).to.eql({ error: true });
  });

  it("returns an error object if the weatherstory fetch is unsuccessful", async () => {
    response.status = 404;
    const actual = await getDataForWxStory("ABC");

    expect(actual).to.eql({ error: true });
  });
});
