# Location and places

When a user searches for a location in the weather search box, we use an ArcGIS
API to suggest matching place names. The ArcGIS service lets us specify what
kinds of places to suggest. We are currently requesting these kinds of places:

|                          |                |                     |                  |
| ------------------------ | -------------- | ------------------- | ---------------- |
| Land Features            | Bay            | Channel             | Cove             |
| Dam                      | Delta          | Gulf                | Lagoon           |
| Lake                     | Ocean          | Reef                | Reservoir        |
| Sea                      | Sound          | Strait              | Waterfall        |
| Wharf                    | Amusement Park | Historical Monument | Landmark         |
| Tourist Attraction       | Zoo            | College             | Beach            |
| Campground               | Golf Course    | Harbor              | Nature Reserve   |
| Other Parks and Outdoors | Park           | Racetrack           | Scenic Overlook  |
| Ski Resort               | Sports Center  | Sports Field        | Wildlife Reserve |
| Airport                  | Ferry          | Marina              | Pier             |
| Port                     | Resort         | Postal              | Populated Place  |

We use this service because ArcGIS has a very large collection of places and we
suspect that searching across so many _kinds_ of places is an overall better
user experience.

However, when we render a location weather page, we use a different place name
database to determine what to show. For that, we use a local spatial database
populated with cities from the Geonames cities500 dataset. Ostensibly, the
cities500 dataset should include most global places with a population of 500 or
more people. We then filter it down to just US locations.

The cities500 dataset does not strictly only include cities or otherwise
incorporated places. It includes some neighborhoods, and in one amusing case,
a fast-food burger restaurant. (We filter that one out too.) But it definitely
does not include recreational attractions, lakes, rivers, airports, and so on.

One practical result is that sometimes a user will search for and select one
place and be shown a page with a different place name.

## Complications

1. Our places dataset is point-based, not polygon-based, so we are looking for
   the place whose point is closest to the lat/lon we receive from ArcGIS. This
   can result in fetching the wrong place. For example, some stretches of New
   York City are actually closer to the point for Hoboken, NJ, than they are to
   the point for New York City.

2. The most appropriate place names can be highly-contextual. For example, in
   some communities, users might expect only to see a city name, while in others
   they would expect to see neighborhoods. While a city like Kansas City is
   divided into neighborhoods, most people would only expect to see "Kansas
   City," not "Waldo." Residents of New York City, meanwhile, might expect to
   see Brooklyn, the Bronx, or Manhattan. Some people might look at their local
   forecast and appreciate seeing their location as a particular creek or park.
   However, someone planning to visit their friend might not know where a creek
   is relative to the city the friend lives in.

3. There is not a single official collection of polygon-based US places. The
   USGS maintains the national [Geographic Names Information System](https://www.usgs.gov/tools/geographic-names-information-system-gnis)
   (GNIS), which is similarly point-based.
