# Alert metadata Schema

```txt
https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/metadata
```

Prioritization and categorization metadata

| Abstract            | Extensible | Status         | Identifiable | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                                                 |
| :------------------ | :--------- | :------------- | :----------- | :---------------- | :-------------------- | :------------------ | :--------------------------------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | No           | Forbidden         | Allowed               | none                | [interop-layer.schema.json\*](../../../api-interop-layer/interop-layer.schema.json "open original schema") |

## metadata Type

`object` ([Alert metadata](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-alert-metadata.md))

# metadata Properties

| Property              | Type      | Required | Nullable       | Defined by                                                                                                                                                                                                                                                                                   |
| :-------------------- | :-------- | :------- | :------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [level](#level)       | `object`  | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-alert-metadata-properties-alert-level.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/metadata/properties/level") |
| [kind](#kind)         | `string`  | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-alert-metadata-properties-kind.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/metadata/properties/kind")         |
| [priority](#priority) | `integer` | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-alert-metadata-properties-priority.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/metadata/properties/priority") |

## level

Alert level information

`level`

* is required

* Type: `object` ([Alert level](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-alert-metadata-properties-alert-level.md))

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-alert-metadata-properties-alert-level.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/metadata/properties/level")

### level Type

`object` ([Alert level](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-alert-metadata-properties-alert-level.md))

## kind

The alert level, as defined by weather.gov.

`kind`

* is required

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-alert-metadata-properties-kind.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/metadata/properties/kind")

### kind Type

`string`

### kind Constraints

**enum**: the value of this property must be equal to one of the following values:

| Value       | Explanation |
| :---------- | :---------- |
| `"warning"` |             |
| `"watch"`   |             |
| `"other"`   |             |

## priority

The priority of this alert relative to others. Lower numbers are higher priority.

`priority`

* is required

* Type: `integer`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-alert-metadata-properties-priority.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/metadata/properties/priority")

### priority Type

`integer`
