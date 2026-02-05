# Hourly forecast Schema

```txt
https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/hours/items
```



| Abstract            | Extensible | Status         | Identifiable | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                                                 |
| :------------------ | :--------- | :------------- | :----------- | :---------------- | :-------------------- | :------------------ | :--------------------------------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | No           | Forbidden         | Allowed               | none                | [interop-layer.schema.json\*](../../../api-interop-layer/interop-layer.schema.json "open original schema") |

## items Type

`object` ([Hourly forecast](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-hourly-forecasts-hourly-forecast.md))

# items Properties

| Property      | Type     | Required | Nullable       | Defined by                                                                                                                                                                                                                                                                                                                       |
| :------------ | :------- | :------- | :------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [time](#time) | `string` | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-hourly-forecasts-hourly-forecast-properties-time.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/hours/items/properties/time") |
| [hour](#hour) | `string` | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-hourly-forecasts-hourly-forecast-properties-hour.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/hours/items/properties/hour") |
| [icon](#icon) | `object` | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-defs-icon.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/hours/items/properties/icon")                                                                                                                                 |

## time

The time at which this hourly forecast begins.

`time`

* is required

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-hourly-forecasts-hourly-forecast-properties-time.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/hours/items/properties/time")

### time Type

`string`

### time Constraints

**date time**: the string must be a date time string, according to [RFC 3339, section 5.6](https://tools.ietf.org/html/rfc3339 "check the specification")

## hour

Human-friendly hour when the hourly forecast begins. Eg, '6 AM

`hour`

* is required

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-hourly-forecasts-hourly-forecast-properties-hour.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/hours/items/properties/hour")

### hour Type

`string`

### hour Constraints

**pattern**: the string must match the following regular expression:&#x20;

```regexp
^1?\d (A|P)M$
```

[try pattern](https://regexr.com/?expression=%5E1%3F%5Cd%20\(A%7CP\)M%24 "try regular expression with regexr.com")

## icon

Information about the icon that represents this forecast period's conditions.

`icon`

* is optional

* Type: `object` ([Icon](interop-layer-defs-icon.md))

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-defs-icon.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/hours/items/properties/icon")

### icon Type

`object` ([Icon](interop-layer-defs-icon.md))
