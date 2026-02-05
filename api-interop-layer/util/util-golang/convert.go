package util_golang

import (
	"math"
)

type UnitDef struct {
	Name     string
	Label    string
	Decimals int
}

type UnitOutDef struct {
	Name     string
	Label    string
	Decimals int
	// Custom converter function. If nil, uses standard conversion logic.
	ConvertFunc func(interface{}) interface{}
}

type Conversion struct {
	In  UnitDef
	Out []UnitOutDef
}

var (
	cardinalLong = []string{
		"north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest", "north",
	}
	cardinalShort = []string{"N", "NE", "E", "SE", "S", "SW", "W", "NW", "N"}
)

var unitMapping = map[string]Conversion{
	"wmoUnit:degC": {
		In: UnitDef{Name: "celsius", Label: "degC", Decimals: 0},
		Out: []UnitOutDef{
			{Name: "fahrenheit", Label: "degF", Decimals: 0, ConvertFunc: func(v interface{}) interface{} {
				val := toFloat(v)
				return val*1.8 + 32
			}},
		},
	},
	"wmoUnit:degF": {
		In: UnitDef{Name: "fahrenheit", Label: "degF", Decimals: 0},
		Out: []UnitOutDef{
			{Name: "celsius", Label: "degC", Decimals: 0, ConvertFunc: func(v interface{}) interface{} {
				val := toFloat(v)
				return (val - 32) / 1.8
			}},
		},
	},
	"wmoUnit:km_h-1": {
		In: UnitDef{Name: "km", Label: "km/h", Decimals: 0},
		Out: []UnitOutDef{
			{Name: "miles", Label: "mph", Decimals: 0, ConvertFunc: func(v interface{}) interface{} {
				return toFloat(v) * 0.621371
			}},
		},
	},
	"wxgov:mph": {
		In: UnitDef{Name: "miles", Label: "mph", Decimals: 0},
		Out: []UnitOutDef{
			{Name: "km", Label: "km/h", Decimals: 0, ConvertFunc: func(v interface{}) interface{} {
				return toFloat(v) * 1.60934
			}},
		},
	},
	"wmoUnit:degree_(angle)": {
		In: UnitDef{Name: "degrees", Label: "degrees", Decimals: 0},
		Out: []UnitOutDef{
			{Name: "cardinalShort", Label: "cardinalShort", Decimals: 0, ConvertFunc: func(v interface{}) interface{} {
				val := toFloat(v)
				idx := int(math.Floor((math.Mod(val, 360) + 22.5) / 45))
				if idx >= 0 && idx < len(cardinalShort) {
					return cardinalShort[idx]
				}
				return ""
			}},
			{Name: "cardinalLong", Label: "cardinalLong", Decimals: 0, ConvertFunc: func(v interface{}) interface{} {
				val := toFloat(v)
				idx := int(math.Floor((math.Mod(val, 360) + 22.5) / 45))
				if idx >= 0 && idx < len(cardinalLong) {
					return cardinalLong[idx]
				}
				return ""
			}},
		},
	},
	"wmoUnit:percent": {
		In:  UnitDef{Name: "percent", Label: "percent", Decimals: 0},
		Out: []UnitOutDef{},
	},
	"wmoUnit:Pa": {
		In: UnitDef{Name: "pascal", Label: "pa", Decimals: 0},
		Out: []UnitOutDef{
			{Name: "millibar", Label: "mb", Decimals: 0, ConvertFunc: func(v interface{}) interface{} {
				return toFloat(v) / 100.0 // 1 hPa = 1 mb = 100 Pa
			}},
			{Name: "inches mercury", Label: "inHg", Decimals: 2, ConvertFunc: func(v interface{}) interface{} {
				return toFloat(v) / 3386.38
			}},
		},
	},
	"wmoUnit:mm": {
		In: UnitDef{Name: "millimeters", Label: "mm", Decimals: 2},
		Out: []UnitOutDef{
			{Name: "inches", Label: "in", Decimals: 2, ConvertFunc: func(v interface{}) interface{} {
				return toFloat(v) * 0.0393701
			}},
		},
	},
	"wmoUnit:m": {
		In: UnitDef{Name: "meters", Label: "m", Decimals: 0},
		Out: []UnitOutDef{
			{Name: "feet", Label: "ft", Decimals: 0, ConvertFunc: func(v interface{}) interface{} {
				return toFloat(v) * 3.28084
			}},
			{Name: "miles", Label: "mi", Decimals: 0, ConvertFunc: func(v interface{}) interface{} {
				return toFloat(v) * 0.000621371
			}},
		},
	},
}

func toFloat(v interface{}) float64 {
	switch val := v.(type) {
	case float64:
		return val
	case int:
		return float64(val)
	case int64:
		return float64(val)
	default:
		return 0
	}
}

func round(value interface{}, decimals int) interface{} {
	fVal, ok := value.(float64)
	if !ok {
		// Try int
		if iVal, ok := value.(int); ok {
			fVal = float64(iVal)
		} else {
			return value // Not number, return as is (e.g. string for cardinal)
		}
	}

	if math.IsNaN(fVal) {
		return value
	}

	multiple := math.Pow(10, float64(decimals))
	return math.Round(fVal*multiple) / multiple
}

func ConvertValue(obj map[string]interface{}) map[string]interface{} {
	unitKey := "unitCode"
	if _, ok := obj["unitCode"]; !ok {
		unitKey = "uom"
	}

	unitCode, ok := obj[unitKey].(string)
	if !ok {
		return obj
	}

	conversion, exists := unitMapping[unitCode]
	if !exists {
		return obj
	}

	value := obj["value"]
	// Clone obj to avoid modifying original globally if it was a pointer (but maps are ref types)
	// Actually we want to modify it like the JS function does (?)
	// JS: delete obj[unitKey]; delete obj.value; return obj;
	// So we modify the input map.
	delete(obj, unitKey)
	delete(obj, "value")

	if value != nil {
		obj[conversion.In.Label] = round(value, conversion.In.Decimals)
	} else {
		obj[conversion.In.Label] = nil
	}

	for _, out := range conversion.Out {
		if value == nil {
			obj[out.Label] = nil
		} else {
			if out.ConvertFunc != nil {
				obj[out.Label] = out.ConvertFunc(value)
			} else {
				// We don't support generic conversion yet as we hardcoded functions
				obj[out.Label] = nil
			}
		}

		if obj[out.Label] != nil {
			obj[out.Label] = round(obj[out.Label], out.Decimals)
		}
	}

	return obj
}

func ConvertProperties(obj map[string]interface{}) map[string]interface{} {
	unitKey := "unitCode"

	// Identify keys to convert
	var keys []string
	for k, v := range obj {
		subMap, ok := v.(map[string]interface{})
		if !ok {
			continue
		}

		if u, ok := subMap["unitCode"].(string); ok {
			if _, exists := unitMapping[u]; exists {
				keys = append(keys, k)
				continue
			}
		}
		if u, ok := subMap["uom"].(string); ok {
			if _, exists := unitMapping[u]; exists {
				unitKey = "uom" // Note: this sets unitKey globally for the loop potentially?
				// JS logic:
				/*
				   if (unitMapping.has(obj[key]?.unitCode)) {
				     return true;
				   }
				   if (unitMapping.has(obj[key]?.uom)) {
				     unitKey = "uom";
				     return true;
				   }
				*/
				// JS updates `unitKey` variable as it filters keys.
				// Since forEach comes later, if any key uses 'uom', it switches unitKey to 'uom'?
				// Wait, JS filter runs first. If multiple keys exist, and one uses unitCode and another uom.
				// If the *last* one checked uses uom, then unitKey is uom.
				// Then the loop runs: `const prop = obj[key]; const conversion = unitMapping.get(prop[unitKey]);`
				// So if unitKey is "uom", it expects "uom" property on ALL items.
				// This implies mixed usage is NOT supported correctly by the referenced JS code!
				// JS Bug? Or assumption that entire object uses same schema.
				// I will replicate the behavior: update unitKey if found.
				keys = append(keys, k)
			}
		}
	}

	for _, key := range keys {
		prop := obj[key].(map[string]interface{})

		// Recheck which key strictly:
		// But I must follow JS logic: `const conversion = unitMapping.get(prop[unitKey]);`
		// Logic suggests `unitKey` is used.

		uCode, _ := prop[unitKey].(string)
		conversion := unitMapping[uCode] // Should exist

		value := prop["value"]

		// Reset prop to new map structure
		// obj[key] = { [conversion.in.label]: ... }
		newProp := make(map[string]interface{})

		if value != nil {
			newProp[conversion.In.Label] = round(value, conversion.In.Decimals)
		} else {
			newProp[conversion.In.Label] = nil
		}

		for _, out := range conversion.Out {
			if value == nil {
				newProp[out.Label] = nil
			} else {
				if out.ConvertFunc != nil {
					newProp[out.Label] = out.ConvertFunc(value)
				}
			}

			if newProp[out.Label] != nil {
				newProp[out.Label] = round(newProp[out.Label], out.Decimals)
			}
		}

		obj[key] = newProp
	}

	return obj
}
