import { expect } from "chai";
import { parseLocations } from "./locations.js";

describe("Alert location parsing", () => {
  it("Correctly parses the case where there are no found locations in the text", () => {
    const input = "* WHAT...North winds 25 to 35 mph with gusts up to 60 to 65 mph\nexpected.\n\n* WHERE...Santa Ynez Mountains Eastern Range.\n\n* WHEN...Until 1 AM PST Friday.\n\n* IMPACTS...Damaging winds will blow down large objects such as\ntrees and power lines. Power outages are expected. See www.your-power-company.com/outages for more information. Travel will\nbe difficult, especially for high profile vehicles. For road safety, see https://transportation.gov/safe-travels . For more weather information, check out https://weather.gov/your-office for up to date forecasts and alerts.";

    const actual = parseLocations(input);

    expect(actual.location).to.be.false;
  });

  it("Can parse locations for a single state from the description", () => {
    const input = "IN NEBRASKA THIS WATCH INCLUDES 15 COUNTIES\n\nIN CENTRAL NEBRASKA\n\nCUSTER\n\nIN NORTH CENTRAL NEBRASKA\n\nBLAINE                BOYD                  BROWN\nCHERRY                GARFIELD              HOLT\nKEYA PAHA             LOUP                  ROCK\nTHOMAS                WHEELER\n\nTHIS INCLUDES THE CITIES OF AINSWORTH, ATKINSON, BARTLETT,\nBASSETT, BREWSTER, BROKEN BOW, BURWELL, BUTTE, CURTIS, DUNNING\n\n* WHAT...North winds 25 to 35 mph with gusts up to 60 to 65 mph\nexpected.\n\n* WHERE...Santa Ynez Mountains Eastern Range.\n\n* WHEN...Until 1 AM PST Friday.\n\n* IMPACTS...Damaging winds will blow down large objects such as\ntrees and power lines. Power outages are expected. See www.your-power-company.com/outages for more information. Travel will\nbe difficult, especially for high profile vehicles. For road safety, see https://transportation.gov/safe-travels . For more weather information, check out https://weather.gov/your-office for up to date forecasts and alerts.";
    const expected = {
      regions: [
        {
          area: "Central Nebraska",
          counties: ["Custer"]
        },
        {
          area: "North Central Nebraska",
          counties: [
            "Blaine",
            "Boyd",
            "Brown",
            "Cherry",
            "Garfield",
            "Holt",
            "Keya Paha",
            "Loup",
            "Rock",
            "Thomas",
            "Wheeler",
          ]
        }
      ],
      cities: [
        "Ainsworth",
        "Atkinson",
        "Bartlett",
        "Bassett",
        "Brewster",
        "Broken Bow",
        "Burwell",
        "Butte",
        "Curtis",
        "Dunning",
      ]
    };

    const actual = parseLocations(input);

    expect(expected).to.eql(actual.locations);
  });

  it("Can parse location info for multiple states from the description", () => {
    const input = "IN OREGON THIS WATCH INCLUDES 3 COUNTIES\n\nIN NORTHERN OREGON\n\nCOUNTY ONE\n\nIN LUNAR OREGON\n\nTRANQUILITY BASE                DARK SIDE\n\nIN NEBRASKA THIS WATCH INCLUDES 15 COUNTIES\n\nIN CENTRAL NEBRASKA\n\nCUSTER\n\nIN NORTH CENTRAL NEBRASKA\n\nBLAINE                BOYD                  BROWN\nCHERRY                GARFIELD              HOLT\nKEYA PAHA             LOUP                  ROCK\nTHOMAS                WHEELER\n\nTHIS INCLUDES THE CITIES OF AINSWORTH, ATKINSON, BARTLETT,\nBASSETT, BREWSTER, BROKEN BOW, BURWELL, BUTTE, CURTIS, DUNNING\n\n* WHAT...North winds 25 to 35 mph with gusts up to 60 to 65 mph\nexpected.\n\n* WHERE...Santa Ynez Mountains Eastern Range.\n\n* WHEN...Until 1 AM PST Friday.\n\n* IMPACTS...Damaging winds will blow down large objects such as\ntrees and power lines. Power outages are expected. See www.your-power-company.com/outages for more information. Travel will\nbe difficult, especially for high profile vehicles. For road safety, see https://transportation.gov/safe-travels . For more weather information, check out https://weather.gov/your-office for up to date forecasts and alerts.";
    const expected = {
      "regions": [
        {"area": "Northern Oregon", "counties": ["County One"]},
        {
          "area": "Lunar Oregon",
          "counties": ["Tranquility Base", "Dark Side"],
        },
        {"area": "Central Nebraska", "counties": ["Custer"]},
        {
          "area": "North Central Nebraska",
          "counties": [
            "Blaine",
            "Boyd",
            "Brown",
            "Cherry",
            "Garfield",
            "Holt",
            "Keya Paha",
            "Loup",
            "Rock",
            "Thomas",
            "Wheeler",
          ],
        },
      ],
      "cities": [
        "Ainsworth",
        "Atkinson",
        "Bartlett",
        "Bassett",
        "Brewster",
        "Broken Bow",
        "Burwell",
        "Butte",
        "Curtis",
        "Dunning",
      ] 
    };

    const actual = parseLocations(input);

    expect(expected).to.eql(actual.locations);
  });
});
