# Alert timing Schema

```txt
https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/timing
```

Human-friendly text describing the beginning and completion of the alert, based on the timezone of the alert area.

| Abstract            | Extensible | Status         | Identifiable | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                                                 |
| :------------------ | :--------- | :------------- | :----------- | :---------------- | :-------------------- | :------------------ | :--------------------------------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | No           | Forbidden         | Allowed               | none                | [interop-layer.schema.json\*](../../../api-interop-layer/interop-layer.schema.json "open original schema") |

## timing Type

`object` ([Alert timing](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-alert-timing.md))

# timing Properties

| Property        | Type     | Required | Nullable       | Defined by                                                                                                                                                                                                                                                                         |
| :-------------- | :------- | :------- | :------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [start](#start) | `string` | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-alert-timing-properties-start.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/timing/properties/start") |
| [end](#end)     | `string` | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-alert-timing-properties-end.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/timing/properties/end")     |

## start



`start`

* is required

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-alert-timing-properties-start.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/timing/properties/start")

### start Type

`string`

## end



`end`

* is required

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-alert-timing-properties-end.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/timing/properties/end")

### end Type

`string`
