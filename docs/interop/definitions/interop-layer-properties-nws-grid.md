# NWS Grid Schema

```txt
https://weather.gov/interop.schema.json#/properties/grid
```

The NWS grid cell that this point falls in.

| Abstract            | Extensible | Status         | Identifiable | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                                                 |
| :------------------ | :--------- | :------------- | :----------- | :---------------- | :-------------------- | :------------------ | :--------------------------------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | No           | Forbidden         | Allowed               | none                | [interop-layer.schema.json\*](../../../api-interop-layer/interop-layer.schema.json "open original schema") |

## grid Type

`object` ([NWS Grid](interop-layer-properties-nws-grid.md))

# grid Properties

| Property                | Type          | Required | Nullable       | Defined by                                                                                                                                                                        |
| :---------------------- | :------------ | :------- | :------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [wfo](#wfo)             | `string`      | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-nws-grid-properties-wfo.md "https://weather.gov/interop.schema.json#/properties/grid/properties/wfo")           |
| [x](#x)                 | `integer`     | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-nws-grid-properties-x.md "https://weather.gov/interop.schema.json#/properties/grid/properties/x")               |
| [y](#y)                 | `integer`     | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-nws-grid-properties-y.md "https://weather.gov/interop.schema.json#/properties/grid/properties/y")               |
| [geometry](#geometry)   | Not specified | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-nws-grid-properties-geometry.md "https://weather.gov/interop.schema.json#/properties/grid/properties/geometry") |
| [elevation](#elevation) | `object`      | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-defs-measures-distance.md "https://weather.gov/interop.schema.json#/properties/grid/properties/elevation")                 |

## wfo

The NWS weather forecasting office (WFO) that serves this point.

`wfo`

* is required

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-nws-grid-properties-wfo.md "https://weather.gov/interop.schema.json#/properties/grid/properties/wfo")

### wfo Type

`string`

### wfo Constraints

**pattern**: the string must match the following regular expression:&#x20;

```regexp
^[A-Z]{3}$
```

[try pattern](https://regexr.com/?expression=%5E%5BA-Z%5D%7B3%7D%24 "try regular expression with regexr.com")

## x

WFO grid X coordinate.

`x`

* is required

* Type: `integer`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-nws-grid-properties-x.md "https://weather.gov/interop.schema.json#/properties/grid/properties/x")

### x Type

`integer`

## y

WFO grid Y coordinate.

`y`

* is required

* Type: `integer`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-nws-grid-properties-y.md "https://weather.gov/interop.schema.json#/properties/grid/properties/y")

### y Type

`integer`

## geometry

GeoJSON Polygon representing the area covered by this WFO grid cell.

`geometry`

* is required

* Type: unknown

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-nws-grid-properties-geometry.md "https://weather.gov/interop.schema.json#/properties/grid/properties/geometry")

### geometry Type

unknown

## elevation

Elevation of this grid point.

`elevation`

* is required

* Type: `object` ([Distance](interop-layer-defs-measures-distance.md))

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-defs-measures-distance.md "https://weather.gov/interop.schema.json#/properties/grid/properties/elevation")

### elevation Type

`object` ([Distance](interop-layer-defs-measures-distance.md))
