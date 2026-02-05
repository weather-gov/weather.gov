# Untitled string in weather.gov API interoperability layer Schema

```txt
https://weather.gov/interop.schema.json#/properties/place/properties/stateFIPS
```

2-digit FIPS code for this state.

| Abstract            | Extensible | Status         | Identifiable            | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                                                 |
| :------------------ | :--------- | :------------- | :---------------------- | :---------------- | :-------------------- | :------------------ | :--------------------------------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | Unknown identifiability | Forbidden         | Allowed               | none                | [interop-layer.schema.json\*](../../../api-interop-layer/interop-layer.schema.json "open original schema") |

## stateFIPS Type

`string`

## stateFIPS Constraints

**pattern**: the string must match the following regular expression:&#x20;

```regexp
^\d{2}$
```

[try pattern](https://regexr.com/?expression=%5E%5Cd%7B2%7D%24 "try regular expression with regexr.com")
