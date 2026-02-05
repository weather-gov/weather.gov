# Alert locations Schema

```txt
https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/locations
```

A list of counties by state region and cities, if an alert description includes embedded location information.

| Abstract            | Extensible | Status         | Identifiable | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                                                 |
| :------------------ | :--------- | :------------- | :----------- | :---------------- | :-------------------- | :------------------ | :--------------------------------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | No           | Forbidden         | Allowed               | none                | [interop-layer.schema.json\*](../../../api-interop-layer/interop-layer.schema.json "open original schema") |

## locations Type

`object` ([Alert locations](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-alert-locations.md))

# locations Properties

| Property            | Type    | Required | Nullable       | Defined by                                                                                                                                                                                                                                                                                           |
| :------------------ | :------ | :------- | :------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [regions](#regions) | `array` | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-alert-locations-properties-list-of-regions.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/locations/properties/regions") |
| [cities](#cities)   | `array` | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-alert-locations-properties-list-of-cities.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/locations/properties/cities")   |

## regions

A list of state regions covered by this alert, as derived from the alert description.

`regions`

* is required

* Type: `object[]` ([Alert location](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-alert-locations-properties-list-of-regions-alert-location.md))

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-alert-locations-properties-list-of-regions.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/locations/properties/regions")

### regions Type

`object[]` ([Alert location](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-alert-locations-properties-list-of-regions-alert-location.md))

## cities

A list of cities impacted by this alert, as derived from the alert description.

`cities`

* is required

* Type: `string[]`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-alert-locations-properties-list-of-cities.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/locations/properties/cities")

### cities Type

`string[]`
