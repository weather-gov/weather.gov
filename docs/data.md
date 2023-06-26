# Data and sources

## Alerts

### API

> Unknown if alerts in the API are immediate or if they are similarly delayed
> like observational data.

- geographic polygon of the WWA area
- list of SAME codes in the WWA (SAME codes identify NWS radio coverage areas)
- list of UGC codes in the WWA (UGC codes are NWS codes for counties)
- list of references (?)
- when the alert was sent
- when it becomes effective
- when the alert onsets (?)
- when the alert expires
- when it ends (??)
- status of the alert ("Actual" or "test", it seems like)
- alert type ("alert", "watch", "warning" maybe?)
- category (?)
- severity
- certainty
- urgency
- sender email address
- sender name (looks like it's the WFO name)
- headline (essentially a title)
- description (body of the alert)
- instruction (what action people should take)
- response (?)
- parameters
  - AWIPS ID
  - WMO ID
  - headline for the alert (this is a human-friendly text blurb summarizing the alert)
  - "motion description" (?)
  - max gust
  - max hail
  - block channels (?)
  - EAS-ORG (?)

## Current conditions (observational data)

### API

> **Warning**  
> Data from the API is delayed by an hour or more due to quality control work
> that is performed upstream in MADIS.

> **Note**  
> It's a little tricky to figure out the correct way to request observations
> data. In our prototyping, we used the user's lat/lng from the browser location
> API to translate into a WFO grid coordinate. From there, we can get a list of
> observation stations. The prototype picks the first one in the list, since a
> grid square can contain multiple observation stations.

- observation station metadata
  - elevation
  - latitutde/longitude
  - URL to API for the station
- timestamp
- text description of current conditions
- URL to an appropriate NWS icon to represent current conditions
- temperature
- dewpoint
- wind direction
- wind speed
- wind gust
- barometric pressure
- sea level pressure
- visibility
- max temperature, past 24 hours
- min temperature, last 24 hours
- precipitation, last 24 hours
- precipitation, last 3 hours
- precipitation, last 6 hours
- relative humidity
- wind chill
- heat index
- cloud coverage, as a 3-letter code (e.g., "CLR")

## Forecast

### API

> **Note**  
> It's a little tricky to figure out the correct way to request forecast data.
> In our prototyping, we used the user's lat/lng from the browser location
> API to translate into a WFO grid coordinate. From there, we can request a
> forecast for that grid cell.

There are two kinds of forecast data provided by the API. The first is daily,
with "today's" forecast further broken into morning, afternoon, night, etc.
The second is an hourly forcast. However, they both contain the same data
elements.

- name (for daily forcast, "today", "this afternoon," etc; for hourly forecasts, blank)
- start time (timebox for when this particular subset of data is valid)
- end time
- whether or not it's daytime (?)
- temperature
- temperature unit (usually Fahrenheit)
- temperature trend (seems to always be empty)
- probability of precipitation
- dew point
- relative humidity
- wind speed
- wind direction
- URL to an appropriate NWS icon to represent current conditions
- short description of conditions (e.g., "mostly sunny")
- detailed forecast (blank for hourly forecasts; a summary of the covered time period for daily forecasts)
