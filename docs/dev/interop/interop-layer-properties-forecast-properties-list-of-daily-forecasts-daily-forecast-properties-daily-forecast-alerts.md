# Daily forecast alerts Schema

```txt
https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/alerts
```

Information about alerts that are valid during this forecast day.

| Abstract            | Extensible | Status         | Identifiable | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                                                 |
| :------------------ | :--------- | :------------- | :----------- | :---------------- | :-------------------- | :------------------ | :--------------------------------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | No           | Forbidden         | Allowed               | none                | [interop-layer.schema.json\*](../../../api-interop-layer/interop-layer.schema.json "open original schema") |

## alerts Type

`object` ([Daily forecast alerts](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-daily-forecast-alerts.md))

# alerts Properties

| Property              | Type     | Required | Nullable       | Defined by                                                                                                                                                                                                                                                                                                                            |
| :-------------------- | :------- | :------- | :------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [metadata](#metadata) | `object` | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-daily-forecast-alerts-properties-daily-forecast-alert-metadata.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/alerts/properties/metadata") |
| [items](#items)       | `array`  | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-daily-forecast-alerts-properties-list-of-alerts.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/alerts/properties/items")                   |

## metadata

Top-level metadata about the alerts for this forecast day.

`metadata`

* is optional

* Type: `object` ([Daily forecast alert metadata](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-daily-forecast-alerts-properties-daily-forecast-alert-metadata.md))

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-daily-forecast-alerts-properties-daily-forecast-alert-metadata.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/alerts/properties/metadata")

### metadata Type

`object` ([Daily forecast alert metadata](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-daily-forecast-alerts-properties-daily-forecast-alert-metadata.md))

## items

List of alerts.

`items`

* is optional

* Type: `object[]` ([Daily forecast alert](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-daily-forecast-alerts-properties-list-of-alerts-daily-forecast-alert.md))

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-daily-forecast-alerts-properties-list-of-alerts.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/alerts/properties/items")

### items Type

`object[]` ([Daily forecast alert](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-daily-forecast-alerts-properties-list-of-alerts-daily-forecast-alert.md))
