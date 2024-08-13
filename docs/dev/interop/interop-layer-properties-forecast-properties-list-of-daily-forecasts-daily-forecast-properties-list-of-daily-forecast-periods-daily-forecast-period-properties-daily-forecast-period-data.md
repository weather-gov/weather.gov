# Daily forecast period data Schema

```txt
https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/periods/items/properties/data
```

The forecast data for this period.

| Abstract            | Extensible | Status         | Identifiable | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                                                 |
| :------------------ | :--------- | :------------- | :----------- | :---------------- | :-------------------- | :------------------ | :--------------------------------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | No           | Forbidden         | Allowed               | none                | [interop-layer.schema.json\*](../../../api-interop-layer/interop-layer.schema.json "open original schema") |

## data Type

`object` ([Daily forecast period data](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-daily-forecast-periods-daily-forecast-period-properties-daily-forecast-period-data.md))

# data Properties

| Property                                                  | Type      | Required | Nullable       | Defined by                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| :-------------------------------------------------------- | :-------- | :------- | :------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [icon](#icon)                                             | `object`  | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-defs-icon.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/periods/items/properties/data/properties/icon")                                                                                                                                                                                                                               |
| [description](#description)                               | `text`    | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-daily-forecast-periods-daily-forecast-period-properties-daily-forecast-period-data-properties-description.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/periods/items/properties/data/properties/description")                               |
| [temperature](#temperature)                               | `object`  | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-defs-measures-temperature.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/periods/items/properties/data/properties/temperature")                                                                                                                                                                                                        |
| [probabilityOfPrecipitation](#probabilityofprecipitation) | `integer` | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-daily-forecast-periods-daily-forecast-period-properties-daily-forecast-period-data-properties-probabilityofprecipitation.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/periods/items/properties/data/properties/probabilityOfPrecipitation") |
| [windSpeed](#windspeed)                                   | `object`  | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-defs-measures-speed.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/periods/items/properties/data/properties/windSpeed")                                                                                                                                                                                                                |
| [windDirection](#winddirection)                           | `string`  | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-daily-forecast-periods-daily-forecast-period-properties-daily-forecast-period-data-properties-winddirection.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/periods/items/properties/data/properties/windDirection")                           |

## icon

Information about the icon that represents this forecast period's conditions.

`icon`

* is optional

* Type: `object` ([Icon](interop-layer-defs-icon.md))

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-defs-icon.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/periods/items/properties/data/properties/icon")

### icon Type

`object` ([Icon](interop-layer-defs-icon.md))

## description

Textual description of the forecast period conditions.

`description`

* is optional

* Type: `text`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-daily-forecast-periods-daily-forecast-period-properties-daily-forecast-period-data-properties-description.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/periods/items/properties/data/properties/description")

### description Type

`text`

## temperature

Forecast temperature for this forecast period.

`temperature`

* is optional

* Type: `object` ([Temperature](interop-layer-defs-measures-temperature.md))

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-defs-measures-temperature.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/periods/items/properties/data/properties/temperature")

### temperature Type

`object` ([Temperature](interop-layer-defs-measures-temperature.md))

## probabilityOfPrecipitation

Forecast probability of precipitation for this forecast period.

`probabilityOfPrecipitation`

* is optional

* Type: `integer`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-daily-forecast-periods-daily-forecast-period-properties-daily-forecast-period-data-properties-probabilityofprecipitation.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/periods/items/properties/data/properties/probabilityOfPrecipitation")

### probabilityOfPrecipitation Type

`integer`

## windSpeed

Forecast wind speed for this forecast period.

`windSpeed`

* is optional

* Type: `object` ([Speed](interop-layer-defs-measures-speed.md))

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-defs-measures-speed.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/periods/items/properties/data/properties/windSpeed")

### windSpeed Type

`object` ([Speed](interop-layer-defs-measures-speed.md))

## windDirection

Forecast wind direction for this forecast period, in cardinal/ordinal direction (eg, N, NW, WNW, etc.).

`windDirection`

* is optional

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-daily-forecast-periods-daily-forecast-period-properties-daily-forecast-period-data-properties-winddirection.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/periods/items/properties/data/properties/windDirection")

### windDirection Type

`string`
