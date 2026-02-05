# Daily forecast period Schema

```txt
https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/periods/items
```



| Abstract            | Extensible | Status         | Identifiable | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                                                 |
| :------------------ | :--------- | :------------- | :----------- | :---------------- | :-------------------- | :------------------ | :--------------------------------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | No           | Forbidden         | Allowed               | none                | [interop-layer.schema.json\*](../../../api-interop-layer/interop-layer.schema.json "open original schema") |

## items Type

`object` ([Daily forecast period](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-daily-forecast-periods-daily-forecast-period.md))

# items Properties

| Property                    | Type      | Required | Nullable       | Defined by                                                                                                                                                                                                                                                                                                                                                           |
| :-------------------------- | :-------- | :------- | :------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [start](#start)             | `string`  | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-daily-forecast-periods-daily-forecast-period-properties-start.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/periods/items/properties/start")                     |
| [end](#end)                 | `string`  | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-daily-forecast-periods-daily-forecast-period-properties-end.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/periods/items/properties/end")                         |
| [isDaytime](#isdaytime)     | `boolean` | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-daily-forecast-periods-daily-forecast-period-properties-isdaytime.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/periods/items/properties/isDaytime")             |
| [isOvernight](#isovernight) | `boolean` | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-daily-forecast-periods-daily-forecast-period-properties-isovernight.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/periods/items/properties/isOvernight")         |
| [monthAndDay](#monthandday) | `string`  | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-daily-forecast-periods-daily-forecast-period-properties-monthandday.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/periods/items/properties/monthAndDay")         |
| [dayName](#dayname)         | `string`  | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-daily-forecast-periods-daily-forecast-period-properties-dayname.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/periods/items/properties/dayName")                 |
| [timeLabel](#timelabel)     | `string`  | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-daily-forecast-periods-daily-forecast-period-properties-timelabel.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/periods/items/properties/timeLabel")             |
| [data](#data)               | `object`  | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-daily-forecast-periods-daily-forecast-period-properties-daily-forecast-period-data.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/periods/items/properties/data") |

## start

The starting time for this period of the daily forecast.

`start`

* is optional

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-daily-forecast-periods-daily-forecast-period-properties-start.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/periods/items/properties/start")

### start Type

`string`

### start Constraints

**date time**: the string must be a date time string, according to [RFC 3339, section 5.6](https://tools.ietf.org/html/rfc3339 "check the specification")

## end

The ending time for this period of the daily forecast.

`end`

* is optional

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-daily-forecast-periods-daily-forecast-period-properties-end.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/periods/items/properties/end")

### end Type

`string`

### end Constraints

**date time**: the string must be a date time string, according to [RFC 3339, section 5.6](https://tools.ietf.org/html/rfc3339 "check the specification")

## isDaytime

Whether this period represents the daytime period. A period can be daytime, nighttime, or overnight.

`isDaytime`

* is optional

* Type: `boolean`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-daily-forecast-periods-daily-forecast-period-properties-isdaytime.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/periods/items/properties/isDaytime")

### isDaytime Type

`boolean`

## isOvernight

Whether this period represents the overnight period. A period can be daytime, nighttime, or overnight.

`isOvernight`

* is optional

* Type: `boolean`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-daily-forecast-periods-daily-forecast-period-properties-isovernight.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/periods/items/properties/isOvernight")

### isOvernight Type

`boolean`

## monthAndDay

The short month name (eg, Jan, Feb, etc.) and day number that this forecast period applies to. Formatted in en-US locale.

`monthAndDay`

* is optional

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-daily-forecast-periods-daily-forecast-period-properties-monthandday.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/periods/items/properties/monthAndDay")

### monthAndDay Type

`string`

### monthAndDay Constraints

**pattern**: the string must match the following regular expression:&#x20;

```regexp
^[A-Z][a-z]{2} d{1,2}$
```

[try pattern](https://regexr.com/?expression=%5E%5BA-Z%5D%5Ba-z%5D%7B2%7D%20d%7B1%2C2%7D%24 "try regular expression with regexr.com")

## dayName

The name of the day this forecast period applies to, or 'Today' if it's the current day. Uses English day names.

`dayName`

* is optional

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-daily-forecast-periods-daily-forecast-period-properties-dayname.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/periods/items/properties/dayName")

### dayName Type

`string`

### dayName Constraints

**pattern**: the string must match the following regular expression:&#x20;

```regexp
^[A-Z][a-z]+$
```

[try pattern](https://regexr.com/?expression=%5E%5BA-Z%5D%5Ba-z%5D%2B%24 "try regular expression with regexr.com")

## timeLabel

Textual representation of the hour range covered by this period, in the timezone of the location.

`timeLabel`

* is optional

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-daily-forecast-periods-daily-forecast-period-properties-timelabel.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/periods/items/properties/timeLabel")

### timeLabel Type

`string`

### timeLabel Constraints

**pattern**: the string must match the following regular expression:&#x20;

```regexp
^1?[0-9]-1?[0-9]$
```

[try pattern](https://regexr.com/?expression=%5E1%3F%5B0-9%5D-1%3F%5B0-9%5D%24 "try regular expression with regexr.com")

## data

The forecast data for this period.

`data`

* is optional

* Type: `object` ([Daily forecast period data](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-daily-forecast-periods-daily-forecast-period-properties-daily-forecast-period-data.md))

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-daily-forecast-periods-daily-forecast-period-properties-daily-forecast-period-data.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/periods/items/properties/data")

### data Type

`object` ([Daily forecast period data](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-daily-forecast-periods-daily-forecast-period-properties-daily-forecast-period-data.md))
