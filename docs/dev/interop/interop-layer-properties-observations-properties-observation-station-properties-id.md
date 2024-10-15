# Untitled string in weather.gov API interoperability layer Schema

```txt
https://weather.gov/interop.schema.json#/properties/observed/properties/station/properties/id
```

The 4-character ID for the observation station.

| Abstract            | Extensible | Status         | Identifiable            | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                                                 |
| :------------------ | :--------- | :------------- | :---------------------- | :---------------- | :-------------------- | :------------------ | :--------------------------------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | Unknown identifiability | Forbidden         | Allowed               | none                | [interop-layer.schema.json\*](../../../api-interop-layer/interop-layer.schema.json "open original schema") |

## id Type

`string`

## id Constraints

**pattern**: the string must match the following regular expression:&#x20;

```regexp
^[A-Z0-9]{4}$
```

[try pattern](https://regexr.com/?expression=%5E%5BA-Z0-9%5D%7B4%7D%24 "try regular expression with regexr.com")
