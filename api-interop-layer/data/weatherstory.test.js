import { expect } from "chai";
import { createSandbox } from "sinon";
import quibble from "quibble";
import { parseTTLFromHeaders } from "../redis.js";

describe("weatherstory module", () => {
  const sandbox = createSandbox();
  const response = {
    statusCode: 200,
    headers: {
      "cache-control": "s-maxage=42",
      "content-type": "application/json",
    },
    body: {
      text: sandbox.stub(),
      dump: sandbox.stub(),
    },
  };

  const connectionPool = {
    request: sandbox.stub(),
  };

  const saveToRedis = sandbox.stub();
  const getFromRedis = sandbox.stub();

  let getDataForWxStory;

  before(async () => {
    await quibble.esm("./connectionPool.js", {}, connectionPool);
    await quibble.esm(
      "../redis.js",
      { getFromRedis, saveToRedis, parseTTLFromHeaders },
      {},
    );

    const module = await import("./weatherstory.js");
    getDataForWxStory = module.default;
  });

  beforeEach(() => {
    sandbox.resetHistory();
    sandbox.resetBehavior();
    response.statusCode = 200;
    response.headers["content-type"] = "application/json";
    connectionPool.request.resolves(response);
    response.body.dump.resolves();
  });

  after(async () => {
    sandbox.restore();
    await quibble.reset();
  });

  describe("returns data if everything goes well", () => {
    it("for two stories", async () => {
      const stories = [
        {
          id: "7ccab810-706b-401c-8757-71f656e56270",
          officeId: "MPX",
          startTime: "2026-01-01T12:00:00+00:00",
          endTime: "2027-01-01T12:00:00+00:00",
          updateTime: "2026-01-10T12:00:00+00:00",
          title: "Testing the test",
          description:
            "This is a triumph. I'm making a note here: huge success",
          altText: "Alternative to text? Pictures!",
          priority: false,
          order: 1,
          image:
            "http://localhost:8000/offices/MPX/weatherstories/7ccab810-706b-401c-8757-71f656e56270/image",
        },
        {
          id: "d9cce8e6-a30e-41e3-b37e-165e1463ba54",
          officeId: "MPX",
          startTime: "2026-01-01T09:00:00+00:00",
          endTime: "2027-01-01T12:00:00+00:00",
          updateTime: "2026-01-10T12:00:00+00:00",
          title: "No image",
          description: "Womp womp",
          altText: "Alternative to text? Pictures!",
          priority: false,
          order: 2,
          image:
            "http://localhost:8000/offices/MPX/weatherstories/d9cce8e6-a30e-41e3-b37e-165e1463ba54/image",
        },
      ];
      response.body.text.resolves(
        JSON.stringify({
          "@context": {
            "@version": "1.1",
          },
          stories: stories,
        }),
      );

      const actual = await getDataForWxStory("ABC");

      expect(actual).to.deep.equal(stories);
    });

    it("for no stories", async () => {
      response.body.text.resolves(JSON.stringify({}));
      const actual = await getDataForWxStory("ABC");

      expect(actual).to.deep.equal({ error: true });
    });
  });

  it("returns an error object if the weatherstory data is invalid", async () => {
    response.body.text.resolves(JSON.stringify({ nometa: {} }));
    const actual = await getDataForWxStory("ABC");

    expect(actual).to.eql({ error: true });
  });

  it("returns an error object if the weatherstory fetch is unsuccessful", async () => {
    response.statusCode = 404;
    const actual = await getDataForWxStory("ABC");

    expect(actual).to.eql([]);
  });

  describe("caching tests", () => {
    const stories = [
      {
        id: "7ccab810-706b-401c-8757-71f656e56270",
        officeId: "MPX",
        startTime: "2026-01-01T12:00:00+00:00",
        endTime: "2027-01-01T12:00:00+00:00",
        updateTime: "2026-01-10T12:00:00+00:00",
        title: "Testing the test",
        description: "This is a triumph. I'm making a note here: huge success",
        altText: "Alternative to text? Pictures!",
        priority: false,
        order: 1,
        image:
          "http://localhost:8000/offices/MPX/weatherstories/7ccab810-706b-401c-8757-71f656e56270/image",
      },
      {
        id: "d9cce8e6-a30e-41e3-b37e-165e1463ba54",
        officeId: "MPX",
        startTime: "2026-01-01T09:00:00+00:00",
        endTime: "2027-01-01T12:00:00+00:00",
        updateTime: "2026-01-10T12:00:00+00:00",
        title: "No image",
        description: "Womp womp",
        altText: "Alternative to text? Pictures!",
        priority: false,
        order: 2,
        image:
          "http://localhost:8000/offices/MPX/weatherstories/d9cce8e6-a30e-41e3-b37e-165e1463ba54/image",
      },
    ];
    beforeEach(() => {
      response.body.text.resolves(
        JSON.stringify({
          "@context": {
            "@version": "1.1",
          },
          stories: stories,
        }),
      );
    });

    it("attempts to fetch from the cache", async () => {
      getFromRedis.resolves(null);
      await getDataForWxStory("ABC");

      expect(getFromRedis.calledWith(`/offices/ABC/weatherstories`)).to.equal(
        true,
      );
    });

    it("returns the cached value, if there is one", async () => {
      const cachedStories = stories.slice(1);
      getFromRedis.resolves(cachedStories);

      const actual = await getDataForWxStory("ABC");

      // It should not have tried to make the request
      expect(connectionPool.request.called).to.equal(false);

      // The result should equal the cached value we set
      expect(actual).to.eql(cachedStories);
    });

    it("caches the stories with the correct ttl", async () => {
      await getDataForWxStory("ABC");

      expect(
        saveToRedis.calledWith(`/offices/ABC/weatherstories`, stories, 42),
      ).to.equal(true);
    });

    it("does not cache if there is a request error", async () => {
      response.statusCode = 403;
      await getDataForWxStory("ABC");

      expect(saveToRedis.called).to.equal(false);
    });
  });
});
