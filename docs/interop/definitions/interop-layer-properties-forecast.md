# Forecast Schema

```txt
https://weather.gov/interop.schema.json#/properties/forecast
```

Forecast for this point.

| Abstract            | Extensible | Status         | Identifiable | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                                                 |
| :------------------ | :--------- | :------------- | :----------- | :---------------- | :-------------------- | :------------------ | :--------------------------------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | No           | Forbidden         | Allowed               | none                | [interop-layer.schema.json\*](../../../api-interop-layer/interop-layer.schema.json "open original schema") |

## forecast Type

`object` ([Forecast](interop-layer-properties-forecast.md))

# forecast Properties

| Property                | Type     | Required | Nullable       | Defined by                                                                                                                                                                                       |
| :---------------------- | :------- | :------- | :------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [generated](#generated) | `string` | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-generated.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/generated")          |
| [updated](#updated)     | `string` | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-updated.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/updated")              |
| [valid](#valid)         | `string` | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-valid.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/valid")                  |
| [days](#days)           | `array`  | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days") |

## generated

When the forecast was generated.

`generated`

* is required

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-generated.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/generated")

### generated Type

`string`

### generated Constraints

**date time**: the string must be a date time string, according to [RFC 3339, section 5.6](https://tools.ietf.org/html/rfc3339 "check the specification")

## updated

When the forecast was last updated.

`updated`

* is required

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-updated.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/updated")

### updated Type

`string`

### updated Constraints

**date time**: the string must be a date time string, according to [RFC 3339, section 5.6](https://tools.ietf.org/html/rfc3339 "check the specification")

## valid

When the forecast is valid. This is a combination of ISO 8601 date-time and duration, in the form 'date-time/duration'.

`valid`

* is required

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-valid.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/valid")

### valid Type

`string`

## days

The daily forecasts for each day in the forecast period.

`days`

* is required

* Type: `object[]` ([Daily forecast](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast.md))

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days")

### days Type

`object[]` ([Daily forecast](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast.md))
