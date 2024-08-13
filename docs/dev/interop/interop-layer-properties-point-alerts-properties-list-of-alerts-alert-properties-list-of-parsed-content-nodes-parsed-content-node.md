# Parsed content node Schema

```txt
https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/description/items
```



| Abstract            | Extensible | Status         | Identifiable | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                                                 |
| :------------------ | :--------- | :------------- | :----------- | :---------------- | :-------------------- | :------------------ | :--------------------------------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | No           | Forbidden         | Allowed               | none                | [interop-layer.schema.json\*](../../../api-interop-layer/interop-layer.schema.json "open original schema") |

## items Type

`object` ([Parsed content node](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-list-of-parsed-content-nodes-parsed-content-node.md))

# items Properties

| Property        | Type     | Required | Nullable       | Defined by                                                                                                                                                                                                                                                                                                                                                    |
| :-------------- | :------- | :------- | :------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [type](#type)   | `string` | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-list-of-parsed-content-nodes-parsed-content-node-properties-type.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/description/items/properties/type")                               |
| [nodes](#nodes) | `array`  | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-list-of-parsed-content-nodes-parsed-content-node-properties-list-of-parsed-in-paragraph-nodes.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/description/items/properties/nodes") |
| [text](#text)   | `string` | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-list-of-parsed-content-nodes-parsed-content-node-properties-text.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/description/items/properties/text")                               |

## type

The kind of content node

`type`

* is required

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-list-of-parsed-content-nodes-parsed-content-node-properties-type.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/description/items/properties/type")

### type Type

`string`

### type Constraints

**enum**: the value of this property must be equal to one of the following values:

| Value         | Explanation |
| :------------ | :---------- |
| `"heading"`   |             |
| `"paragraph"` |             |

## nodes

For paragraph nodes, the list of content nodes that go into the paragraph.

`nodes`

* is optional

* Type: `object[]` ([Parsed in-paragraph node](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-list-of-parsed-content-nodes-parsed-content-node-properties-list-of-parsed-in-paragraph-nodes-parsed-in-paragraph-node.md))

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-list-of-parsed-content-nodes-parsed-content-node-properties-list-of-parsed-in-paragraph-nodes.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/description/items/properties/nodes")

### nodes Type

`object[]` ([Parsed in-paragraph node](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-list-of-parsed-content-nodes-parsed-content-node-properties-list-of-parsed-in-paragraph-nodes-parsed-in-paragraph-node.md))

## text

For heading nodes, the textual content of the node

`text`

* is optional

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-list-of-parsed-content-nodes-parsed-content-node-properties-text.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/description/items/properties/text")

### text Type

`string`
