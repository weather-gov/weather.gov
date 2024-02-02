# We will store and use our own geospatial data

Date: 2024-02-01

### Status

Accepted

### Context

We currently rely on the API for all location-based information, which is generally the right (and only) solution. However, it's not the ideal approach in every case, and it won't be sufficient forever.

1. The place names returned by the API are for a point, which can produce odd results when trying to get a place name for a grid. A grid is a polygon, so we must pick a single point representing that polygon and ask the API for the nearest place name point, and which point we pick is consequential here. There is no right or even best answer.

2. The API can return alerts for a point, but (again) we are working with a polygon. The point we pick to represent that polygon is consequential, and there is no right or best answer. For example, the grid at LIX 113,110 contains land for a small portion of Biloxi, MS. However, all four corner point of the grid polygon _as well as_ the polygon centroid are over water. If we use any of those five points to represent the polygon, the API will only give us marine alerts. A person in that portion of Biloxi would never see land alerts.

See the [location-handling proposal doc](https://docs.google.com/document/d/1Cp0VfgD6HuMU9ZVWX0UKzZVLpVUM7-mpvC1ihvAKxFY/edit#heading=h.5esd92rc2393) for more information (including pretty screenshots illustrating the problems).

### Decision

- We will load geospatial data in the database used by Drupal using standard geospatial types and functions.
- We will prefer data created and managed by the National Weather Service, such as the data from the [AWIPS basemap shapefiles](https://www.weather.gov/gis/AWIPSShapefiles).

### Consequences

- We may be able to reduce the number of API calls we make when servicing a request to our site.
- We will have more control over place names.
- We will have to do more work to identify the correct alerts for a given grid.
- We will have to store more data in our database.
- We will need to support updating our geospatial data over time.
