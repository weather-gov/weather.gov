# weather.gov API interoperability layer Schema

```txt
https://weather.gov/interop.schema.json
```

The results of querying for a specific latitude and longitude

| Abstract            | Extensible | Status         | Identifiable | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                                               |
| :------------------ | :--------- | :------------- | :----------- | :---------------- | :-------------------- | :------------------ | :------------------------------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | No           | Forbidden         | Allowed               | none                | [interop-layer.schema.json](../../../api-interop-layer/interop-layer.schema.json "open original schema") |

## weather.gov API interoperability layer Type

`object` ([weather.gov API interoperability layer](interop-layer.md))

# weather.gov API interoperability layer Properties

| Property                | Type     | Required | Nullable       | Defined by                                                                                                                                              |
| :---------------------- | :------- | :------- | :------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [alerts](#alerts)       | `object` | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-point-alerts.md "https://weather.gov/interop.schema.json#/properties/alerts")         |
| [point](#point)         | `object` | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-point.md "https://weather.gov/interop.schema.json#/properties/point")                 |
| [place](#place)         | `object` | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-place.md "https://weather.gov/interop.schema.json#/properties/place")                 |
| [grid](#grid)           | `object` | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-nws-grid.md "https://weather.gov/interop.schema.json#/properties/grid")               |
| [observed](#observed)   | `object` | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-observations.md "https://weather.gov/interop.schema.json#/properties/observed")       |
| [forecast](#forecast)   | `object` | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-forecast.md "https://weather.gov/interop.schema.json#/properties/forecast")           |
| [satellite](#satellite) | `object` | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-satellite.md "https://weather.gov/interop.schema.json#/properties/satellite")         |
| [@metadata](#metadata)  | `object` | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-response-metadata.md "https://weather.gov/interop.schema.json#/properties/@metadata") |

## alerts

Alerts that are applicable to the given lat/lon.

`alerts`

* is optional

* Type: `object` ([Point alerts](interop-layer-properties-point-alerts.md))

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-point-alerts.md "https://weather.gov/interop.schema.json#/properties/alerts")

### alerts Type

`object` ([Point alerts](interop-layer-properties-point-alerts.md))

## point

Information about the point

`point`

* is optional

* Type: `object` ([Point](interop-layer-properties-point.md))

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-point.md "https://weather.gov/interop.schema.json#/properties/point")

### point Type

`object` ([Point](interop-layer-properties-point.md))

## place

Information about the place at the described point, as close as we know.

`place`

* is optional

* Type: `object` ([Place](interop-layer-properties-place.md))

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-place.md "https://weather.gov/interop.schema.json#/properties/place")

### place Type

`object` ([Place](interop-layer-properties-place.md))

## grid

The NWS grid cell that this point falls in.

`grid`

* is optional

* Type: `object` ([NWS Grid](interop-layer-properties-nws-grid.md))

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-nws-grid.md "https://weather.gov/interop.schema.json#/properties/grid")

### grid Type

`object` ([NWS Grid](interop-layer-properties-nws-grid.md))

## observed

Most-recently observed conditions for this location from the nearest approved observation station.

`observed`

* is optional

* Type: `object` ([Observations](interop-layer-properties-observations.md))

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-observations.md "https://weather.gov/interop.schema.json#/properties/observed")

### observed Type

`object` ([Observations](interop-layer-properties-observations.md))

## forecast

Forecast for this point.

`forecast`

* is optional

* Type: `object` ([Forecast](interop-layer-properties-forecast.md))

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-forecast.md "https://weather.gov/interop.schema.json#/properties/forecast")

### forecast Type

`object` ([Forecast](interop-layer-properties-forecast.md))

## satellite

Information about satellite imagery for this point.

`satellite`

* is optional

* Type: `object` ([Satellite](interop-layer-properties-satellite.md))

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-satellite.md "https://weather.gov/interop.schema.json#/properties/satellite")

### satellite Type

`object` ([Satellite](interop-layer-properties-satellite.md))

## @metadata

Metadata about the response itself.

`@metadata`

* is optional

* Type: `object` ([Response metadata](interop-layer-properties-response-metadata.md))

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-response-metadata.md "https://weather.gov/interop.schema.json#/properties/@metadata")

### @metadata Type

`object` ([Response metadata](interop-layer-properties-response-metadata.md))

# weather.gov API interoperability layer Definitions

## Definitions group alert

Reference this group by using

```json
{"$ref":"https://weather.gov/interop.schema.json#/$defs/alert"}
```

| Property | Type | Required | Nullable | Defined by |
| :------- | :--- | :------- | :------- | :--------- |

## Definitions group icon

Reference this group by using

```json
{"$ref":"https://weather.gov/interop.schema.json#/$defs/icon"}
```

| Property      | Type     | Required | Nullable       | Defined by                                                                                                                                                 |
| :------------ | :------- | :------- | :------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [icon](#icon) | `string` | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-defs-icon-properties-icon.md "https://weather.gov/interop.schema.json#/$defs/icon/properties/icon") |
| [base](#base) | `string` | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-defs-icon-properties-base.md "https://weather.gov/interop.schema.json#/$defs/icon/properties/base") |

### icon

The icon filename, as used by weather.gov.

`icon`

* is optional

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-defs-icon-properties-icon.md "https://weather.gov/interop.schema.json#/$defs/icon/properties/icon")

#### icon Type

`string`

### base

The basename of the icon (without file extension).

`base`

* is optional

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-defs-icon-properties-base.md "https://weather.gov/interop.schema.json#/$defs/icon/properties/base")

#### base Type

`string`

## Definitions group measures

Reference this group by using

```json
{"$ref":"https://weather.gov/interop.schema.json#/$defs/measures"}
```

| Property | Type | Required | Nullable | Defined by |
| :------- | :--- | :------- | :------- | :--------- |
