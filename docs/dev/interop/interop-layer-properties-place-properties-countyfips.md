# Untitled string in weather.gov API interoperability layer Schema

```txt
https://weather.gov/interop.schema.json#/properties/place/properties/countyFIPS
```

5-digit FIPS code for this county. Note that this value has the state FIPS code prepended to the usual 3-digit county FIPS code.

| Abstract            | Extensible | Status         | Identifiable            | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                                                 |
| :------------------ | :--------- | :------------- | :---------------------- | :---------------- | :-------------------- | :------------------ | :--------------------------------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | Unknown identifiability | Forbidden         | Allowed               | none                | [interop-layer.schema.json\*](../../../api-interop-layer/interop-layer.schema.json "open original schema") |

## countyFIPS Type

`string`

## countyFIPS Constraints

**pattern**: the string must match the following regular expression:&#x20;

```regexp
^\d{5}$
```

[try pattern](https://regexr.com/?expression=%5E%5Cd%7B5%7D%24 "try regular expression with regexr.com")
