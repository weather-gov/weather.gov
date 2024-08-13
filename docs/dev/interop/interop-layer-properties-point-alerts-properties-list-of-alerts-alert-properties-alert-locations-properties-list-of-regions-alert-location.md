# Alert location Schema

```txt
https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/locations/properties/regions/items
```



| Abstract            | Extensible | Status         | Identifiable | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                                                 |
| :------------------ | :--------- | :------------- | :----------- | :---------------- | :-------------------- | :------------------ | :--------------------------------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | No           | Forbidden         | Allowed               | none                | [interop-layer.schema.json\*](../../../api-interop-layer/interop-layer.schema.json "open original schema") |

## items Type

`object` ([Alert location](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-alert-locations-properties-list-of-regions-alert-location.md))

# items Properties

| Property              | Type     | Required | Nullable       | Defined by                                                                                                                                                                                                                                                                                                                                                                |
| :-------------------- | :------- | :------- | :------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [area](#area)         | `string` | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-alert-locations-properties-list-of-regions-alert-location-properties-area.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/locations/properties/regions/items/properties/area")                 |
| [counties](#counties) | `array`  | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-alert-locations-properties-list-of-regions-alert-location-properties-list-of-counties.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/locations/properties/regions/items/properties/counties") |

## area

The name of a state region covered by this alert, as derived from the alert description.

`area`

* is required

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-alert-locations-properties-list-of-regions-alert-location-properties-area.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/locations/properties/regions/items/properties/area")

### area Type

`string`

## counties

A list of counties within this state region covered by this alert, as derived from the alert description.

`counties`

* is required

* Type: `string[]`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-alert-locations-properties-list-of-regions-alert-location-properties-list-of-counties.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/locations/properties/regions/items/properties/counties")

### counties Type

`string[]`
