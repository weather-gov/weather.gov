# Daily forecast alert Schema

```txt
https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/alerts/properties/items/items
```



| Abstract            | Extensible | Status         | Identifiable | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                                                 |
| :------------------ | :--------- | :------------- | :----------- | :---------------- | :-------------------- | :------------------ | :--------------------------------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | No           | Forbidden         | Allowed               | none                | [interop-layer.schema.json\*](../../../api-interop-layer/interop-layer.schema.json "open original schema") |

## items Type

`object` ([Daily forecast alert](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-daily-forecast-alerts-properties-list-of-alerts-daily-forecast-alert.md))

# items Properties

| Property                | Type      | Required | Nullable       | Defined by                                                                                                                                                                                                                                                                                                                                                                               |
| :---------------------- | :-------- | :------- | :------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [id](#id)               | `string`  | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-daily-forecast-alerts-properties-list-of-alerts-daily-forecast-alert-properties-id.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/alerts/properties/items/items/properties/id")               |
| [event](#event)         | `string`  | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-daily-forecast-alerts-properties-list-of-alerts-daily-forecast-alert-properties-event.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/alerts/properties/items/items/properties/event")         |
| [level](#level)         | `string`  | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-daily-forecast-alerts-properties-list-of-alerts-daily-forecast-alert-properties-level.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/alerts/properties/items/items/properties/level")         |
| [offset](#offset)       | `integer` | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-daily-forecast-alerts-properties-list-of-alerts-daily-forecast-alert-properties-offset.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/alerts/properties/items/items/properties/offset")       |
| [duration](#duration)   | `integer` | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-daily-forecast-alerts-properties-list-of-alerts-daily-forecast-alert-properties-duration.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/alerts/properties/items/items/properties/duration")   |
| [remainder](#remainder) | `integer` | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-daily-forecast-alerts-properties-list-of-alerts-daily-forecast-alert-properties-remainder.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/alerts/properties/items/items/properties/remainder") |

## id

An ID for this alert. NOTE: this may not be globally unique.

`id`

* is optional

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-daily-forecast-alerts-properties-list-of-alerts-daily-forecast-alert-properties-id.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/alerts/properties/items/items/properties/id")

### id Type

`string`

## event

The event type for the alert. Eg, 'Severe Thunderstorm Warning,' etc.

`event`

* is optional

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-daily-forecast-alerts-properties-list-of-alerts-daily-forecast-alert-properties-event.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/alerts/properties/items/items/properties/event")

### event Type

`string`

## level

The alert level, as defined by weather.gov.

`level`

* is optional

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-daily-forecast-alerts-properties-list-of-alerts-daily-forecast-alert-properties-level.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/alerts/properties/items/items/properties/level")

### level Type

`string`

### level Constraints

**enum**: the value of this property must be equal to one of the following values:

| Value       | Explanation |
| :---------- | :---------- |
| `"warning"` |             |
| `"watch"`   |             |
| `"other"`   |             |

## offset

The number of hours after the first whole hour covered by this forecast period when the alert will begin.

`offset`

* is optional

* Type: `integer`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-daily-forecast-alerts-properties-list-of-alerts-daily-forecast-alert-properties-offset.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/alerts/properties/items/items/properties/offset")

### offset Type

`integer`

## duration

The number of hours that this alert will be active after the first whole hour of this forecast period, up to the total number of hours remaining in the forecast period.

`duration`

* is optional

* Type: `integer`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-daily-forecast-alerts-properties-list-of-alerts-daily-forecast-alert-properties-duration.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/alerts/properties/items/items/properties/duration")

### duration Type

`integer`

## remainder

The number of hours that this alert will be active in excess of the duration property.

`remainder`

* is optional

* Type: `integer`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-daily-forecast-alerts-properties-list-of-alerts-daily-forecast-alert-properties-remainder.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/alerts/properties/items/items/properties/remainder")

### remainder Type

`integer`
