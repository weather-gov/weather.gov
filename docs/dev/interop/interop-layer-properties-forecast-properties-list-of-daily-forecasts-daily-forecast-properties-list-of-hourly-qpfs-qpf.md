# QPF Schema

```txt
https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/qpf/items
```



| Abstract            | Extensible | Status         | Identifiable | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                                                 |
| :------------------ | :--------- | :------------- | :----------- | :---------------- | :-------------------- | :------------------ | :--------------------------------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | No           | Forbidden         | Allowed               | none                | [interop-layer.schema.json\*](../../../api-interop-layer/interop-layer.schema.json "open original schema") |

## items Type

`object` ([QPF](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-hourly-qpfs-qpf.md))

# items Properties

| Property                | Type     | Required | Nullable       | Defined by                                                                                                                                                                                                                                                                                                              |
| :---------------------- | :------- | :------- | :------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [start](#start)         | `string` | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-hourly-qpfs-qpf-properties-start.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/qpf/items/properties/start")         |
| [end](#end)             | `string` | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-hourly-qpfs-qpf-properties-end.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/qpf/items/properties/end")             |
| [startHour](#starthour) | `string` | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-hourly-qpfs-qpf-properties-starthour.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/qpf/items/properties/startHour") |
| [endHour](#endhour)     | `string` | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-hourly-qpfs-qpf-properties-endhour.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/qpf/items/properties/endHour")     |

## start

The starting time for this QPF forecast.

`start`

* is optional

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-hourly-qpfs-qpf-properties-start.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/qpf/items/properties/start")

### start Type

`string`

### start Constraints

**date time**: the string must be a date time string, according to [RFC 3339, section 5.6](https://tools.ietf.org/html/rfc3339 "check the specification")

## end

The ending time for this QPF forecast.

`end`

* is optional

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-hourly-qpfs-qpf-properties-end.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/qpf/items/properties/end")

### end Type

`string`

### end Constraints

**date time**: the string must be a date time string, according to [RFC 3339, section 5.6](https://tools.ietf.org/html/rfc3339 "check the specification")

## startHour

The starting hour in the timezone of the forecast, in AM/PM.

`startHour`

* is optional

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-hourly-qpfs-qpf-properties-starthour.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/qpf/items/properties/startHour")

### startHour Type

`string`

### startHour Constraints

**pattern**: the string must match the following regular expression:&#x20;

```regexp
^1?\d (A|P)M$
```

[try pattern](https://regexr.com/?expression=%5E1%3F%5Cd%20\(A%7CP\)M%24 "try regular expression with regexr.com")

## endHour

The ending hour in the timezone of the forecast, in AM/PM.

`endHour`

* is optional

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-hourly-qpfs-qpf-properties-endhour.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/qpf/items/properties/endHour")

### endHour Type

`string`

### endHour Constraints

**pattern**: the string must match the following regular expression:&#x20;

```regexp
^1?\d (A|P)M$
```

[try pattern](https://regexr.com/?expression=%5E1%3F%5Cd%20\(A%7CP\)M%24 "try regular expression with regexr.com")
