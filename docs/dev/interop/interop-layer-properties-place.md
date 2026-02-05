# Place Schema

```txt
https://weather.gov/interop.schema.json#/properties/place
```

Information about the place at the described point, as close as we know.

| Abstract            | Extensible | Status         | Identifiable | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                                                 |
| :------------------ | :--------- | :------------- | :----------- | :---------------- | :-------------------- | :------------------ | :--------------------------------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | No           | Forbidden         | Allowed               | none                | [interop-layer.schema.json\*](../../../api-interop-layer/interop-layer.schema.json "open original schema") |

## place Type

`object` ([Place](interop-layer-properties-place.md))

# place Properties

| Property                  | Type     | Required | Nullable       | Defined by                                                                                                                                                                          |
| :------------------------ | :------- | :------- | :------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [name](#name)             | `string` | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-place-properties-name.md "https://weather.gov/interop.schema.json#/properties/place/properties/name")             |
| [state](#state)           | `string` | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-place-properties-state.md "https://weather.gov/interop.schema.json#/properties/place/properties/state")           |
| [stateName](#statename)   | `string` | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-place-properties-statename.md "https://weather.gov/interop.schema.json#/properties/place/properties/stateName")   |
| [county](#county)         | `string` | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-place-properties-county.md "https://weather.gov/interop.schema.json#/properties/place/properties/county")         |
| [timezone](#timezone)     | `string` | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-place-properties-timezone.md "https://weather.gov/interop.schema.json#/properties/place/properties/timezone")     |
| [stateFIPS](#statefips)   | `string` | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-place-properties-statefips.md "https://weather.gov/interop.schema.json#/properties/place/properties/stateFIPS")   |
| [countyFIPS](#countyfips) | `string` | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-place-properties-countyfips.md "https://weather.gov/interop.schema.json#/properties/place/properties/countyFIPS") |
| [fullName](#fullname)     | `string` | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-place-properties-fullname.md "https://weather.gov/interop.schema.json#/properties/place/properties/fullName")     |

## name

City or other municipal name.

`name`

* is required

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-place-properties-name.md "https://weather.gov/interop.schema.json#/properties/place/properties/name")

### name Type

`string`

## state

2-letter abbreviation of the state or territory.

`state`

* is required

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-place-properties-state.md "https://weather.gov/interop.schema.json#/properties/place/properties/state")

### state Type

`string`

### state Constraints

**maximum length**: the maximum number of characters for this string is: `2`

**minimum length**: the minimum number of characters for this string is: `2`

## stateName

Full name of the state.

`stateName`

* is required

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-place-properties-statename.md "https://weather.gov/interop.schema.json#/properties/place/properties/stateName")

### stateName Type

`string`

## county

Full name of the county.

`county`

* is required

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-place-properties-county.md "https://weather.gov/interop.schema.json#/properties/place/properties/county")

### county Type

`string`

## timezone

Full tzdb name of the timezone at this point, as best we know.

`timezone`

* is required

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-place-properties-timezone.md "https://weather.gov/interop.schema.json#/properties/place/properties/timezone")

### timezone Type

`string`

## stateFIPS

2-digit FIPS code for this state.

`stateFIPS`

* is required

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-place-properties-statefips.md "https://weather.gov/interop.schema.json#/properties/place/properties/stateFIPS")

### stateFIPS Type

`string`

### stateFIPS Constraints

**pattern**: the string must match the following regular expression:&#x20;

```regexp
^\d{2}$
```

[try pattern](https://regexr.com/?expression=%5E%5Cd%7B2%7D%24 "try regular expression with regexr.com")

## countyFIPS

5-digit FIPS code for this county. Note that this value has the state FIPS code prepended to the usual 3-digit county FIPS code.

`countyFIPS`

* is required

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-place-properties-countyfips.md "https://weather.gov/interop.schema.json#/properties/place/properties/countyFIPS")

### countyFIPS Type

`string`

### countyFIPS Constraints

**pattern**: the string must match the following regular expression:&#x20;

```regexp
^\d{5}$
```

[try pattern](https://regexr.com/?expression=%5E%5Cd%7B5%7D%24 "try regular expression with regexr.com")

## fullName

The full name of this place, with state or territory abbreviation.

`fullName`

* is required

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-place-properties-fullname.md "https://weather.gov/interop.schema.json#/properties/place/properties/fullName")

### fullName Type

`string`
