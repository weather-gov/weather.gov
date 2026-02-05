# Alert level Schema

```txt
https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/metadata/properties/level
```

Alert level information

| Abstract            | Extensible | Status         | Identifiable | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                                                 |
| :------------------ | :--------- | :------------- | :----------- | :---------------- | :-------------------- | :------------------ | :--------------------------------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | No           | Forbidden         | Allowed               | none                | [interop-layer.schema.json\*](../../../api-interop-layer/interop-layer.schema.json "open original schema") |

## level Type

`object` ([Alert level](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-alert-metadata-properties-alert-level.md))

# level Properties

| Property              | Type      | Required | Nullable       | Defined by                                                                                                                                                                                                                                                                                                                           |
| :-------------------- | :-------- | :------- | :------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [priority](#priority) | `integer` | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-alert-metadata-properties-alert-level-properties-priority.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/metadata/properties/level/properties/priority") |
| [text](#text)         | `string`  | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-alert-metadata-properties-alert-level-properties-text.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/metadata/properties/level/properties/text")         |

## priority

The priority of this alert relative to others. Lower numbers are higher priority.

`priority`

* is required

* Type: `integer`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-alert-metadata-properties-alert-level-properties-priority.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/metadata/properties/level/properties/priority")

### priority Type

`integer`

## text

The alert level, as defined by weather.gov.

`text`

* is required

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-alert-metadata-properties-alert-level-properties-text.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/metadata/properties/level/properties/text")

### text Type

`string`

### text Constraints

**enum**: the value of this property must be equal to one of the following values:

| Value       | Explanation |
| :---------- | :---------- |
| `"warning"` |             |
| `"watch"`   |             |
| `"other"`   |             |
