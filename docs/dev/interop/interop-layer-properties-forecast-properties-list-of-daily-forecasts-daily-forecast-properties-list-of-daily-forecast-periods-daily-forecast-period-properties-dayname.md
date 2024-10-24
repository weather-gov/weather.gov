# Untitled string in weather.gov API interoperability layer Schema

```txt
https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/periods/items/properties/dayName
```

The name of the day this forecast period applies to, or 'Today' if it's the current day. Uses English day names.

| Abstract            | Extensible | Status         | Identifiable            | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                                                 |
| :------------------ | :--------- | :------------- | :---------------------- | :---------------- | :-------------------- | :------------------ | :--------------------------------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | Unknown identifiability | Forbidden         | Allowed               | none                | [interop-layer.schema.json\*](../../../api-interop-layer/interop-layer.schema.json "open original schema") |

## dayName Type

`string`

## dayName Constraints

**pattern**: the string must match the following regular expression:&#x20;

```regexp
^[A-Z][a-z]+$
```

[try pattern](https://regexr.com/?expression=%5E%5BA-Z%5D%5Ba-z%5D%2B%24 "try regular expression with regexr.com")
