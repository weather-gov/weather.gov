import { expect } from "chai";
import sinon from "sinon";
import { parseDescription, extractUrls } from "./description.js";


describe("Alert Description Parsing", () => {
  it("Can parse a basic WHAT/WHERE/WHEN example", () => {
    const input = "* WHAT...Snow expected. Total snow accumulations of 5 to 10\ninches.\n\n";
    const expected = [
      {
        type: "heading",
        text: "what"
      },
      {
        type: "paragraph",
        nodes: [
          {
            type: "text",
            content: "Snow expected. Total snow accumulations of 5 to 10 inches."
          }
        ]
      }
    ];

    const actual = parseDescription(input);

    expect(expected).to.eql(actual);
  });

  it("Can parse a full WHAT/WHERE/WHEN example", () => {
    let input = "* WHAT...Snow expected. Total snow accumulations of 5 to 10\ninches.\n\n";
    input += "* WHERE...Eastern San Juan Mountains Above 10000 Feet.\n\n";
    input += "* WHEN...From 11 PM this evening to 11 PM MST Thursday.\n\n";
    input += "* IMPACTS...Travel could be very difficult.";
    input += " The hazardous conditions may impact travel over Wolf Creek Pass.";

    const expected = [
      {
        "type": "heading",
        "text": "what",
      },
      {
        "type": "paragraph",
        "nodes": [
          {
            "type": "text",
            "content":
            "Snow expected. Total snow accumulations of 5 to 10 inches.",
          },
        ],
      },
      {
        "type": "heading",
        "text": "where",
      },
      {
        "type": "paragraph",
        "nodes": [
          {
            "type": "text",
            "content":
            "Eastern San Juan Mountains Above 10000 Feet.",
          },
        ],
      },
      {
        "type": "heading",
        "text": "when",
      },
      {
        "type": "paragraph",
        "nodes": [
          {
            "type": "text",
            "content":
            "From 11 PM this evening to 11 PM MST Thursday.",
          },
        ],
      },
      {
        "type": "heading",
        "text": "impacts",
      },
      {
        "type": "paragraph",
        "nodes": [
          {
            "type": "text",
            "content":
            "Travel could be very difficult. The hazardous conditions may impact travel over Wolf Creek Pass.",
          },
        ],
      }
    ];

    const actual = parseDescription(input);

    expect(expected).to.eql(actual);
  });

  it("Can parse a full description with an overview", () => {
    const input = `...WINTER CONDITIONS RETURN TO THE SIERRA AND NORTHEAST CALIFORNIA
FOR MID-LATE WEEK...

This bit...has ellipses in the middle...but is not an overview.

.After a few days of warm weather, a potent winter storm will bring
windy and colder conditions with periods of heavy snow to the Sierra
and higher elevations of northeast California later this week. While
weather-related travel impacts aren't expected through Wednesday
morning, conditions will begin to worsen Wednesday afternoon and
evening, with the most widespread winter travel impacts likely from
Wednesday evening through much of Thursday.

* WHAT...Heavy snow possible. Snow accumulations of 4 to 10 inches
above 5000 feet west of US-395, with 10 to 20 inches possible for
higher passes such as Fredonyer Summit and Yuba Pass. Winds
gusting as high as 50 mph.

* WHERE...Lassen-Eastern Plumas-Eastern Sierra Counties.

* WHEN...From late Wednesday morning through Friday morning.
Heaviest snow is most likely from late Wednesday afternoon through
Thursday morning.

* IMPACTS...Travel could be very difficult at times, with hazardous
conditions impacting the commutes from Wednesday evening through
Friday morning. Strong winds may blow down some tree limbs and a
few power outages may result.

* ADDITIONAL DETAILS...Snow levels will start near 6500 feet on
Wednesday, then drop to near 5500 feet Wednesday night and near
5000 feet by Thursday morning.`;

    const expected = [
            {
                "type": "paragraph",
                "nodes": [
                    {
                        "type": "text",
                        "content":
                          "WINTER CONDITIONS RETURN TO THE SIERRA AND NORTHEAST CALIFORNIA FOR MID-LATE WEEK",
                    },
                ],
            },
            {
                "type": "paragraph",
                "nodes": [
                    {
                        "type": "text",
                        "content":
                            "This bit...has ellipses in the middle...but is not an overview.",
                    },
                ],
            },
            {
                "type": "paragraph",
                "nodes": [
                    {
                        "type": "text",
                        "content":
                            ".After a few days of warm weather, a potent winter storm will bring windy and colder conditions with periods of heavy snow to the Sierra and higher elevations of northeast California later this week. While weather-related travel impacts aren't expected through Wednesday morning, conditions will begin to worsen Wednesday afternoon and evening, with the most widespread winter travel impacts likely from Wednesday evening through much of Thursday.",
                    },
                ],
            },
            {
                "type": "heading",
                "text": "what",
            },
            {
                "type": "paragraph",
                "nodes": [
                    {
                        "type": "text",
                        "content":
                            "Heavy snow possible. Snow accumulations of 4 to 10 inches above 5000 feet west of US-395, with 10 to 20 inches possible for higher passes such as Fredonyer Summit and Yuba Pass. Winds gusting as high as 50 mph.",
                    },
                ],
            },
            {
                "type": "heading",
                "text": "where",
            },
            {
                "type": "paragraph",
                "nodes": [
                    {
                        "type": "text",
                        "content":
                            "Lassen-Eastern Plumas-Eastern Sierra Counties.",
                    },
                ],
            },
            {
                "type": "heading",
                "text": "when",
            },
            {
                "type": "paragraph",
                "nodes": [
                    {
                        "type": "text",
                        "content":
                            "From late Wednesday morning through Friday morning. Heaviest snow is most likely from late Wednesday afternoon through Thursday morning.",
                    },
                ],
            },
            {
                "type": "heading",
                "text": "impacts",
            },
            {
                "type": "paragraph",
                "nodes": [
                    {
                        "type": "text",
                        "content":
                            "Travel could be very difficult at times, with hazardous conditions impacting the commutes from Wednesday evening through Friday morning. Strong winds may blow down some tree limbs and a few power outages may result.",
                    },
                ],
            },
            {
                "type": "heading",
                "text": "additional details",
            },
            {
                "type": "paragraph",
                "nodes": [
                    {
                        "type": "text",
                        "content":
                            "Snow levels will start near 6500 feet on Wednesday, then drop to near 5500 feet Wednesday night and near 5000 feet by Thursday morning.",
                    },
                ],
            },
    ];

    const actual = parseDescription(input);

    expect(expected).to.eql(actual);
  });
});

describe("Extracting URLs", () => {
  it("Can parse out a basic gov url", () => {
    const input = `Scattered showers with brief heavy rainfall will continue this week.
A low pressure system from the north will batter your area, relentlessly.
Be sure to stock up. See https://www.weather.gov/safety/food for more information.`;
    const expected = {
      type: "link",
      url: "https://www.weather.gov/safety/food",
      external: false
    };

    const actual = extractUrls(input);

    expect(actual).to.have.lengthOf(1);
    expect(expected).to.eql(actual[0]);
  });

  it("Ignores non-government URLs", () => {
    const input = `Scattered showers with brief heavy rainfall will go on and
on and on, boring everyone who has to stay inside. They will attempt to visit sites
like https://fake.com/should/not/render which will not be clickable URLs.`;
    const actual = extractUrls(input);

    expect(actual).to.be.false;
  });

  it("Ignores URLs that have user/pass information in them", () => {
    const input = `Weather will, once again, be horrendous wherever you happen to be.
Maybe you are cursed? Anyway, the spammers would like you to click this link here that
has a username and password in the URL (https://root:1234@weather.gov/hack/the/gibson), which
you shouldn't be able to do thanks to Cautious Public Servants TM.`;
    const actual = extractUrls(input);

    expect(actual).to.be.false;
  });

  it("Can parse nodes that include an internal link", () => {
    const input = `* WHAT...There will be winds like you cannot believe. See https://winds.weather.gov/info for more information.`;
    const expected = [
      {
        "type": "heading",
        "text": "what",
      },
      {
        "type": "paragraph",
        "nodes": [
          {
            "type": "text",
            "content":
            "There will be winds like you cannot believe. See ",
          },
          {
            "type": "link",
            "url": "https://winds.weather.gov/info",
            "external": false,
          },
          {
            "type": "text",
            "content": " for more information.",
          },
        ],
      }
    ];

    const actual = parseDescription(input);

    expect(expected).to.eql(actual);
  });

  it("Can parse nodes that include an external link", () => {
    const input = `* IMPACTS...There will be shaking like you cannot believe. See https://usgs.gov/earthquakes for more information.`;
    const expected = [
      {
        "type": "heading",
        "text": "impacts",
      },
      {
        "type": "paragraph",
        "nodes": [
          {
            "type": "text",
            "content":
            "There will be shaking like you cannot believe. See ",
          },
          {
            "type": "link",
            "url": "https://usgs.gov/earthquakes",
            "external": true,
          },
          {
            "type": "text",
            "content": " for more information.",
          },
        ],
      }
    ];

    const actual = parseDescription(input);

    expect(expected).to.eql(actual);
  });

  it("Correctly parses nodes that include invalid urls", () => {
    const input = `* WHEN...There will be weather like you cannot believe. See https://other-weather-site.com for more information, or even check out http://insecure.gov or else www.foo.net`;
    const expected = [
      {
        "type": "heading",
        "text": "when",
      },
      {
        "type": "paragraph",
        "nodes": [
          {
            "type": "text",
            "content":
            "There will be weather like you cannot believe. See https://other-weather-site.com for more information, or even check out http://insecure.gov or else www.foo.net",
          },
        ],
      }
    ];

    const actual = parseDescription(input);

    expect(expected).to.eql(actual);
  });

  it("Can parse nodes that include both internal and external links", () => {
    const input = `Damaging winds will blow down large objects such as trees and power lines. Power outages are expected. See www.your-power-company.com/outages for more information. Travel will be difficult, especially for high profile vehicles. For road safety, see https://transportation.gov/safe-travels . For more weather information, check out https://weather.gov/your-office for up to date forecasts and alerts.`;
    const expected = [
      {
        "type": "paragraph",
        "nodes": [
          {
            "type": "text",
            "content":
            "Damaging winds will blow down large objects such as trees and power lines. Power outages are expected. See www.your-power-company.com/outages for more information. Travel will be difficult, especially for high profile vehicles. For road safety, see "
          },
          {
            "type": "link",
            "url": "https://transportation.gov/safe-travels",
            "external": true,
          },
          {
            "type": "text",
            "content":
            " . For more weather information, check out ",
          },
          {
            "type": "link",
            "url": "https://weather.gov/your-office",
            "external": false,
          },
          {
            "type": "text",
            "content": " for up to date forecasts and alerts.",
          },
        ],
      }
    ];

    const actual = parseDescription(input);

    expect(expected).to.eql(actual);
  });
});
