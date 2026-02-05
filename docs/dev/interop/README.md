# README

## Top-level Schemas

* [weather.gov API interoperability layer](./interop-layer.md "The results of querying for a specific latitude and longitude") – `https://weather.gov/interop.schema.json`

## Other Schemas

### Objects

* [Alert](./interop-layer-properties-point-alerts-properties-list-of-alerts-alert.md) – `https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items`

* [Alert level](./interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-alert-metadata-properties-alert-level.md "Alert level information") – `https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/metadata/properties/level`

* [Alert location](./interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-alert-locations-properties-list-of-regions-alert-location.md) – `https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/locations/properties/regions/items`

* [Alert locations](./interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-alert-locations.md "A list of counties by state region and cities, if an alert description includes embedded location information") – `https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/locations`

* [Alert metadata](./interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-alert-metadata.md "Prioritization and categorization metadata") – `https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/metadata`

* [Alert timing](./interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-alert-timing.md "Human-friendly text describing the beginning and completion of the alert, based on the timezone of the alert area") – `https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/timing`

* [Daily forecast](./interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast.md) – `https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items`

* [Daily forecast alert](./interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-daily-forecast-alerts-properties-list-of-alerts-daily-forecast-alert.md) – `https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/alerts/properties/items/items`

* [Daily forecast alert metadata](./interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-daily-forecast-alerts-properties-daily-forecast-alert-metadata.md "Top-level metadata about the alerts for this forecast day") – `https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/alerts/properties/metadata`

* [Daily forecast alerts](./interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-daily-forecast-alerts.md "Information about alerts that are valid during this forecast day") – `https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/alerts`

* [Daily forecast period](./interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-daily-forecast-periods-daily-forecast-period.md) – `https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/periods/items`

* [Daily forecast period data](./interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-daily-forecast-periods-daily-forecast-period-properties-daily-forecast-period-data.md "The forecast data for this period") – `https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/periods/items/properties/data`

* [Distance](./interop-layer-defs-measures-distance.md) – `https://weather.gov/interop.schema.json#/$defs/measures/distance`

* [Forecast](./interop-layer-properties-forecast.md "Forecast for this point") – `https://weather.gov/interop.schema.json#/properties/forecast`

* [Hourly forecast](./interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-hourly-forecasts-hourly-forecast.md) – `https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/hours/items`

* [Icon](./interop-layer-defs-icon.md "Information about the icon that represents this forecast period's conditions") – `https://weather.gov/interop.schema.json#/$defs/icon`

* [NWS Grid](./interop-layer-properties-nws-grid.md "The NWS grid cell that this point falls in") – `https://weather.gov/interop.schema.json#/properties/grid`

* [Observation data](./interop-layer-properties-observations-properties-observation-data.md "The observed data") – `https://weather.gov/interop.schema.json#/properties/observed/properties/data`

* [Observation station](./interop-layer-properties-observations-properties-observation-station.md "Metadata about the observation station that reported this data") – `https://weather.gov/interop.schema.json#/properties/observed/properties/station`

* [Observations](./interop-layer-properties-observations.md "Most-recently observed conditions for this location from the nearest approved observation station") – `https://weather.gov/interop.schema.json#/properties/observed`

* [Parsed content node](./interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-list-of-parsed-content-nodes-parsed-content-node.md) – `https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/description/items`

* [Parsed in-paragraph node](./interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-list-of-parsed-content-nodes-parsed-content-node-properties-list-of-parsed-in-paragraph-nodes-parsed-in-paragraph-node.md) – `https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/description/items/properties/nodes/items`

* [Place](./interop-layer-properties-place.md "Information about the place at the described point, as close as we know") – `https://weather.gov/interop.schema.json#/properties/place`

* [Point](./interop-layer-properties-point.md "Information about the point") – `https://weather.gov/interop.schema.json#/properties/point`

* [Point alerts](./interop-layer-properties-point-alerts.md "Alerts that are applicable to the given lat/lon") – `https://weather.gov/interop.schema.json#/properties/alerts`

* [QPF](./interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-hourly-qpfs-qpf.md) – `https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/qpf/items`

* [Response API timing](./interop-layer-properties-response-metadata-properties-response-timing-properties-response-api-timing.md "Time spent making and receiving each request and response to the NWS public API") – `https://weather.gov/interop.schema.json#/properties/@metadata/properties/timing/properties/api`

* [Response metadata](./interop-layer-properties-response-metadata.md "Metadata about the response itself") – `https://weather.gov/interop.schema.json#/properties/@metadata`

* [Response timing](./interop-layer-properties-response-metadata-properties-response-timing.md "The time spent answering the request") – `https://weather.gov/interop.schema.json#/properties/@metadata/properties/timing`

* [Satellite](./interop-layer-properties-satellite.md "Information about satellite imagery for this point") – `https://weather.gov/interop.schema.json#/properties/satellite`

* [Speed](./interop-layer-defs-measures-speed.md) – `https://weather.gov/interop.schema.json#/$defs/measures/speed`

* [Temperature](./interop-layer-defs-measures-temperature.md) – `https://weather.gov/interop.schema.json#/$defs/measures/temperature`

### Arrays

* [List of alerts](./interop-layer-properties-point-alerts-properties-list-of-alerts.md "The alerts themselves") – `https://weather.gov/interop.schema.json#/properties/alerts/properties/items`

* [List of alerts](./interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-daily-forecast-alerts-properties-list-of-alerts.md "List of alerts") – `https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/alerts/properties/items`

* [List of areas](./interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-list-of-areas.md "A list of areas affected by this alert, as provided by the origin") – `https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/area`

* [List of cities](./interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-alert-locations-properties-list-of-cities.md "A list of cities impacted by this alert, as derived from the alert description") – `https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/locations/properties/cities`

* [List of counties](./interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-alert-locations-properties-list-of-regions-alert-location-properties-list-of-counties.md "A list of counties within this state region covered by this alert, as derived from the alert description") – `https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/locations/properties/regions/items/properties/counties`

* [List of daily forecast periods](./interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-daily-forecast-periods.md "The periods of the daily forecast, such as overnight, day, and night") – `https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/periods`

* [List of daily forecasts](./interop-layer-properties-forecast-properties-list-of-daily-forecasts.md "The daily forecasts for each day in the forecast period") – `https://weather.gov/interop.schema.json#/properties/forecast/properties/days`

* [List of hourly QPFs](./interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-hourly-qpfs.md "Forecast quantitative precipitation for this forecast period") – `https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/qpf`

* [List of hourly forecasts](./interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-hourly-forecasts.md "Hourly forecast for each hour of this daily forecast period") – `https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/hours`

* [List of parsed content nodes](./interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-list-of-parsed-content-nodes.md "The alert description, parsed into content nodes") – `https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/description`

* [List of parsed in-paragraph nodes](./interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-list-of-parsed-content-nodes-parsed-content-node-properties-list-of-parsed-in-paragraph-nodes.md "For paragraph nodes, the list of content nodes that go into the paragraph") – `https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/description/items/properties/nodes`

* [List of regions](./interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-alert-locations-properties-list-of-regions.md "A list of state regions covered by this alert, as derived from the alert description") – `https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/locations/properties/regions`

## Version Note

The schemas linked above follow the JSON Schema Spec version: `https://json-schema.org/draft/2020-12/schema`
