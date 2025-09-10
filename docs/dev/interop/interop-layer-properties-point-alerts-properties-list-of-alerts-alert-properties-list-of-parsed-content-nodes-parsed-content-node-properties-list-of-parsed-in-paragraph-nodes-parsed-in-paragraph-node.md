# Parsed in-paragraph node Schema

```txt
https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/description/items/properties/nodes/items
```



| Abstract            | Extensible | Status         | Identifiable | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                                                 |
| :------------------ | :--------- | :------------- | :----------- | :---------------- | :-------------------- | :------------------ | :--------------------------------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | No           | Forbidden         | Allowed               | none                | [interop-layer.schema.json\*](../../../api-interop-layer/interop-layer.schema.json "open original schema") |

## items Type

`object` ([Parsed in-paragraph node](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-list-of-parsed-content-nodes-parsed-content-node-properties-list-of-parsed-in-paragraph-nodes-parsed-in-paragraph-node.md))

# items Properties

| Property              | Type      | Required | Nullable       | Defined by                                                                                                                                                                                                                                                                                                                                                                                                                           |
| :-------------------- | :-------- | :------- | :------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [type](#type)         | `string`  | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-list-of-parsed-content-nodes-parsed-content-node-properties-list-of-parsed-in-paragraph-nodes-parsed-in-paragraph-node-properties-type.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/description/items/properties/nodes/items/properties/type")         |
| [text](#text)         | `string`  | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-list-of-parsed-content-nodes-parsed-content-node-properties-list-of-parsed-in-paragraph-nodes-parsed-in-paragraph-node-properties-text.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/description/items/properties/nodes/items/properties/text")         |
| [url](#url)           | `string`  | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-list-of-parsed-content-nodes-parsed-content-node-properties-list-of-parsed-in-paragraph-nodes-parsed-in-paragraph-node-properties-url.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/description/items/properties/nodes/items/properties/url")           |
| [external](#external) | `boolean` | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-list-of-parsed-content-nodes-parsed-content-node-properties-list-of-parsed-in-paragraph-nodes-parsed-in-paragraph-node-properties-external.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/description/items/properties/nodes/items/properties/external") |

## type

The type of in-paragraph content node.

`type`

* is required

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-list-of-parsed-content-nodes-parsed-content-node-properties-list-of-parsed-in-paragraph-nodes-parsed-in-paragraph-node-properties-type.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/description/items/properties/nodes/items/properties/type")

### type Type

`string`

### type Constraints

**enum**: the value of this property must be equal to one of the following values:

| Value    | Explanation |
| :------- | :---------- |
| `"text"` |             |
| `"link"` |             |

## text

For text nodes, the textual content.

`text`

* is optional

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-list-of-parsed-content-nodes-parsed-content-node-properties-list-of-parsed-in-paragraph-nodes-parsed-in-paragraph-node-properties-text.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/description/items/properties/nodes/items/properties/text")

### text Type

`string`

## url

For link nodes, the URL.

`url`

* is optional

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-list-of-parsed-content-nodes-parsed-content-node-properties-list-of-parsed-in-paragraph-nodes-parsed-in-paragraph-node-properties-url.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/description/items/properties/nodes/items/properties/url")

### url Type

`string`

## external

For link nodes, whether the link is for a site outside of weather.gov.

`external`

* is optional

* Type: `boolean`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-list-of-parsed-content-nodes-parsed-content-node-properties-list-of-parsed-in-paragraph-nodes-parsed-in-paragraph-node-properties-external.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/description/items/properties/nodes/items/properties/external")

### external Type

`boolean`
