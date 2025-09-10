## Data behavior tests

> [!NOTE]  
> Data structure tests refer to data manipulation done by weather.gov in order
> to meet our needs.

### Alerts

- data structure
- filters
  - alerts in the same forecast zone as the user are included
  - alerts in the same fire zone as the user are included
  - alerts in the same county zone as the user are included
  - alerts in the same county SAME code as the user are included
  - alerts with a geospatial polygon that intersects the user's grid point are
    incldued
  - marine alerts are not included
  - alerts are sorted according to alert severity order

### Observations

- data structure
- handles the feels like temperature
  - if no heat index or wind chill, use current temperature
  - if a heat index is set, use that
  - if no heat index but a wind chilld is set, use the wind chill
- handles invalid observations
  - if the first observation is invalid, returns the second
  - if the third observation is invalid, returns an error
- wind speed
  - if wind is null, retains null
  - if wind speed is zero, retains zero
  - if wind speed is nonzero, returns wind speed in mph

### Hourly forecast

- data structure
- times are reported in the location's timezone
- alerts
  - data structure
  - alerts are associated with the correct starting hour
  - alerts are assigned the correct duration
- filters
  - past hours are not included
  - concluded alerts are not included

### Hourly precipitation

- past hours are not included
- precipitation amount is rounded to hundredths of an inch

### Daily forecast

- data structure
- hourly data
  - the first hour is the top of the next hour
  - the hours for "today" end at 6am, relative to the location
  - future days are 6am to 6am, relative to the location
