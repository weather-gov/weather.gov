# Observations Schema

```txt
https://weather.gov/interop.schema.json#/properties/observed
```

Most-recently observed conditions for this location from the nearest approved observation station.

| Abstract            | Extensible | Status         | Identifiable | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                                                 |
| :------------------ | :--------- | :------------- | :----------- | :---------------- | :-------------------- | :------------------ | :--------------------------------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | No           | Forbidden         | Allowed               | none                | [interop-layer.schema.json\*](../../../api-interop-layer/interop-layer.schema.json "open original schema") |

## observed Type

`object` ([Observations](interop-layer-properties-observations.md))

# observed Properties

| Property                    | Type     | Required | Nullable       | Defined by                                                                                                                                                                                          |
| :-------------------------- | :------- | :------- | :------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [timestamp](#timestamp)     | `string` | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-observations-properties-timestamp.md "https://weather.gov/interop.schema.json#/properties/observed/properties/timestamp")         |
| [icon](#icon)               | `object` | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-defs-icon.md "https://weather.gov/interop.schema.json#/properties/observed/properties/icon")                                                 |
| [description](#description) | `string` | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-observations-properties-description.md "https://weather.gov/interop.schema.json#/properties/observed/properties/description")     |
| [station](#station)         | `object` | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-observations-properties-observation-station.md "https://weather.gov/interop.schema.json#/properties/observed/properties/station") |
| [data](#data)               | `object` | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-observations-properties-observation-data.md "https://weather.gov/interop.schema.json#/properties/observed/properties/data")       |

## timestamp

When the observation was recorded.

`timestamp`

* is required

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-observations-properties-timestamp.md "https://weather.gov/interop.schema.json#/properties/observed/properties/timestamp")

### timestamp Type

`string`

### timestamp Constraints

**date time**: the string must be a date time string, according to [RFC 3339, section 5.6](https://tools.ietf.org/html/rfc3339 "check the specification")

## icon

Information about the icon that represents this forecast period's conditions.

`icon`

* is required

* Type: `object` ([Icon](interop-layer-defs-icon.md))

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-defs-icon.md "https://weather.gov/interop.schema.json#/properties/observed/properties/icon")

### icon Type

`object` ([Icon](interop-layer-defs-icon.md))

## description

Textual description of the observed conditions, if available.

`description`

* is optional

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-observations-properties-description.md "https://weather.gov/interop.schema.json#/properties/observed/properties/description")

### description Type

`string`

## station

Metadata about the observation station that reported this data.

`station`

* is required

* Type: `object` ([Observation station](interop-layer-properties-observations-properties-observation-station.md))

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-observations-properties-observation-station.md "https://weather.gov/interop.schema.json#/properties/observed/properties/station")

### station Type

`object` ([Observation station](interop-layer-properties-observations-properties-observation-station.md))

## data

The observed data. The full list of properties is not provided here as it is taken directly from the NWS public API and is not controlled by weather.gov. The data provided by the NWS public API is converted into US and SI units.

`data`

* is required

* Type: `object` ([Observation data](interop-layer-properties-observations-properties-observation-data.md))

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-observations-properties-observation-data.md "https://weather.gov/interop.schema.json#/properties/observed/properties/data")

### data Type

`object` ([Observation data](interop-layer-properties-observations-properties-observation-data.md))
