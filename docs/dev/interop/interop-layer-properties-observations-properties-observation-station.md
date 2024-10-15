# Observation station Schema

```txt
https://weather.gov/interop.schema.json#/properties/observed/properties/station
```

Metadata about the observation station that reported this data.

| Abstract            | Extensible | Status         | Identifiable | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                                                 |
| :------------------ | :--------- | :------------- | :----------- | :---------------- | :-------------------- | :------------------ | :--------------------------------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | No           | Forbidden         | Allowed               | none                | [interop-layer.schema.json\*](../../../api-interop-layer/interop-layer.schema.json "open original schema") |

## station Type

`object` ([Observation station](interop-layer-properties-observations-properties-observation-station.md))

# station Properties

| Property                | Type     | Required | Nullable       | Defined by                                                                                                                                                                                                                          |
| :---------------------- | :------- | :------- | :------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [id](#id)               | `string` | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-observations-properties-observation-station-properties-id.md "https://weather.gov/interop.schema.json#/properties/observed/properties/station/properties/id")     |
| [name](#name)           | `string` | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-observations-properties-observation-station-properties-name.md "https://weather.gov/interop.schema.json#/properties/observed/properties/station/properties/name") |
| [elevation](#elevation) | `object` | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-defs-measures-distance.md "https://weather.gov/interop.schema.json#/properties/observed/properties/station/properties/elevation")                                            |
| [distance](#distance)   | `object` | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-defs-measures-distance.md "https://weather.gov/interop.schema.json#/properties/observed/properties/station/properties/distance")                                             |

## id

The 4-character ID for the observation station.

`id`

* is required

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-observations-properties-observation-station-properties-id.md "https://weather.gov/interop.schema.json#/properties/observed/properties/station/properties/id")

### id Type

`string`

### id Constraints

**pattern**: the string must match the following regular expression:&#x20;

```regexp
^[A-Z0-9]{4}$
```

[try pattern](https://regexr.com/?expression=%5E%5BA-Z0-9%5D%7B4%7D%24 "try regular expression with regexr.com")

## name

The full name of the observation station.

`name`

* is required

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-observations-properties-observation-station-properties-name.md "https://weather.gov/interop.schema.json#/properties/observed/properties/station/properties/name")

### name Type

`string`

## elevation

The elevation at the observation station.

`elevation`

* is required

* Type: `object` ([Distance](interop-layer-defs-measures-distance.md))

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-defs-measures-distance.md "https://weather.gov/interop.schema.json#/properties/observed/properties/station/properties/elevation")

### elevation Type

`object` ([Distance](interop-layer-defs-measures-distance.md))

## distance

The flat-ground distance between the observation station and the requested point.

`distance`

* is required

* Type: `object` ([Distance](interop-layer-defs-measures-distance.md))

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-defs-measures-distance.md "https://weather.gov/interop.schema.json#/properties/observed/properties/station/properties/distance")

### distance Type

`object` ([Distance](interop-layer-defs-measures-distance.md))
