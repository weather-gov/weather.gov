# Daily forecast Schema

```txt
https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items
```



| Abstract            | Extensible | Status         | Identifiable | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                                                 |
| :------------------ | :--------- | :------------- | :----------- | :---------------- | :-------------------- | :------------------ | :--------------------------------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | No           | Forbidden         | Allowed               | none                | [interop-layer.schema.json\*](../../../api-interop-layer/interop-layer.schema.json "open original schema") |

## items Type

`object` ([Daily forecast](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast.md))

# items Properties

| Property            | Type     | Required | Nullable       | Defined by                                                                                                                                                                                                                                                                         |
| :------------------ | :------- | :------- | :------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [start](#start)     | `string` | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-start.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/start")                            |
| [end](#end)         | `string` | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-end.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/end")                                |
| [periods](#periods) | `array`  | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-daily-forecast-periods.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/periods") |
| [qpf](#qpf)         | Merged   | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-hourly-qpfs.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/qpf")                |
| [hours](#hours)     | `array`  | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-hourly-forecasts.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/hours")         |
| [alerts](#alerts)   | `object` | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-daily-forecast-alerts.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/alerts")           |

## start

The starting time for this daily forecast.

`start`

* is required

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-start.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/start")

### start Type

`string`

### start Constraints

**date time**: the string must be a date time string, according to [RFC 3339, section 5.6](https://tools.ietf.org/html/rfc3339 "check the specification")

## end

The ending time for this daily forecast.

`end`

* is required

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-end.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/end")

### end Type

`string`

### end Constraints

**date time**: the string must be a date time string, according to [RFC 3339, section 5.6](https://tools.ietf.org/html/rfc3339 "check the specification")

## periods

The periods of the daily forecast, such as overnight, day, and night.

`periods`

* is required

* Type: `object[]` ([Daily forecast period](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-daily-forecast-periods-daily-forecast-period.md))

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-daily-forecast-periods.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/periods")

### periods Type

`object[]` ([Daily forecast period](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-daily-forecast-periods-daily-forecast-period.md))

## qpf

Forecast quantitative precipitation for this forecast period. Note that QPF is delivered in multi-hour totals rather than individual-hour totals, so it must be treated differently than other forecast period data.

`qpf`

* is required

* Type: `object[]` ([QPF](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-hourly-qpfs-qpf.md))

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-hourly-qpfs.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/qpf")

### qpf Type

`object[]` ([QPF](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-hourly-qpfs-qpf.md))

all of

* [Untitled undefined type in weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-hourly-qpfs-allof-0.md "check type definition")

## hours

Hourly forecast for each hour of this daily forecast period. The full list of properties is not provided here as it is taken directly from the NWS public API and is not controlled by weather.gov. The properties listed below are created by weather.gov and are the only guaranteed properties.

`hours`

* is required

* Type: `object[]` ([Hourly forecast](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-hourly-forecasts-hourly-forecast.md))

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-hourly-forecasts.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/hours")

### hours Type

`object[]` ([Hourly forecast](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-hourly-forecasts-hourly-forecast.md))

## alerts

Information about alerts that are valid during this forecast day.

`alerts`

* is required

* Type: `object` ([Daily forecast alerts](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-daily-forecast-alerts.md))

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-daily-forecast-alerts.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/alerts")

### alerts Type

`object` ([Daily forecast alerts](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-daily-forecast-alerts.md))
