package ghwo

import (
	"encoding/json"
	"os"
	"reflect"
	"slices"
	"testing"
)

var testProcessedLegendJson = `
{
  "SevereThunderstorm": {
    "name": "Severe Thunderstorm Risk",
    "category": {
      "0": {
        "category": 0,
        "color": "#000",
        "levelName": "zero",
        "definition": "none"
      },
      "1": {
        "category": 1,
        "color": "#111",
        "levelName": "one",
        "definition": "some"
      },
      "2": {
        "category": 2,
        "color": "#222",
        "levelName": "two",
        "definition": "lots"
      }
    },
    "scale": 2
  },
  "Waterspout": {
    "name": "Waterspout Risk",
    "category": {
      "0": {
        "category": 0,
        "color": "green",
        "levelName": "green",
        "definition": "green"
      },
      "1": {
        "category": 1,
        "color": "yellow",
        "levelName": "yellow",
        "definition": "yellow"
      },
      "2": {
        "category": 2,
        "color": "orange",
        "levelName": "orange",
        "definition": "orange"
      },
      "3": {
        "category": 3,
        "color": "red",
        "levelName": "red",
        "definition": "red"
      },
      "4": {
        "category": 4,
        "color": "purple",
        "levelName": "purple",
        "definition": "purple"
      }
    },
    "scale": 4
  },
  "Pasta": {
    "name": "Pasta",
    "category": {
      "0": {
        "category": 0,
        "color": "#fff",
        "levelName": "alfredo",
        "definition": "A cream sauce"
      },
      "1": {
        "category": 1,
        "color": "#f00",
        "levelName": "marinara",
        "definition": "A tomato sauce"
      }
    },
    "scale": 1
  }
}`

var testChickletJson = `{
  "SevereThunderstorm": {
    "name": "Severe Thunderstorm Risk",
    "periods": {
      "period1": {
        "imagePath": "/images/SevereThunderstormFromChicklet1.jpg"
      },
      "period2": {
        "imagePath": "/images/SevereThunderstormFromChicklet2.jpg"
      }
    }
  }
}`

var testGHWODataJson = `{
  "countyName": "FR_Benjamin",
  "1978-09-17T12:00:00-05:00": {
    "SevereThunderstorm": 2,
    "Waterspout": 0,
    "Meatball": 2
  },
  "1978-10-01T14:00:00+00:00": {
    "SevereThunderstorm": 1,
    "Waterspout": 0,
    "Meatball": 1
  },
  "1978-12-06T13:30:00+00:00": {
    "SevereThunderstorm": 0,
    "Waterspout": 0,
    "Meatball": 3
  }
}`

func TestGetMaxScaleForLegend(t *testing.T) {
	jsonDataScale2 := `
{
  "Scale-2 Risk (Rip)": {
    "name": "Scale-2 Risk (Rip)",
    "category": {
      "0": {
        "color": "#000",
        "definition": "none",
        "levelName": "zero",
        "category": 0
      },
      "2": {
        "color": "#111",
        "definition": "some",
        "levelName": "one",
        "category": 2
      },
      "3": {
        "color": "#222",
        "definition": "lots",
        "levelName": "two",
        "category": 3
      }
    }
  }
}`
	jsonDataScale3 := `
{
  "Scale-3 Risk": {
    "name": "Scale-3 Risk",
    "category": {
      "0": {
        "color": "#000",
        "definition": "none",
        "levelName": "zero",
        "category": 0
      },
      "1": {
        "color": "#111",
        "definition": "some",
        "levelName": "one",
        "category": 1
      },
      "2": {
        "color": "#222",
        "definition": "lots",
        "levelName": "two",
        "category": 2
      },
      "3": {
        "color": "#333",
        "definition": "even more",
        "levelName": "three",
        "category": 3
      }
    }
  }
}`
	jsonDataScale4 := `
{
  "Scale-4 Risk": {
    "name": "Scale-4 Risk",
    "category": {
      "0": {
        "color": "#000",
        "definition": "none",
        "levelName": "zero",
        "category": 0
      },
      "1": {
        "color": "#111",
        "definition": "some",
        "levelName": "one",
        "category": 1
      },
      "2": {
        "color": "#222",
        "definition": "lots",
        "levelName": "two",
        "category": 2
      },
      "3": {
        "color": "#333",
        "definition": "even more",
        "levelName": "three",
        "category": 3
      },
      "4": {
        "color": "#444",
        "definition": "still more",
        "levelName": "four",
        "category": 4
      }
    }
  }
}`
	jsonDataScale5 := `
{
  "Scale-5 Risk": {
    "name": "Scale-5 Risk",
    "category": {
      "0": {
        "color": "#000",
        "definition": "none",
        "levelName": "zero",
        "category": 0
      },
      "1": {
        "color": "#111",
        "definition": "some",
        "levelName": "one",
        "category": 1
      },
      "2": {
        "color": "#222",
        "definition": "lots",
        "levelName": "two",
        "category": 2
      },
      "3": {
        "color": "#333",
        "definition": "even more",
        "levelName": "three",
        "category": 3
      },
      "4": {
        "color": "#444",
        "definition": "still more",
        "levelName": "four",
        "category": 4
      },
      "5": {
        "color": "#555",
        "definition": "the most",
        "levelName": "five",
        "category": 5
      }
    }
  }
}`

	var legendScale2 OutputSummaryLegend
	var legendScale3 OutputSummaryLegend
	var legendScale4 OutputSummaryLegend
	var legendScale5 OutputSummaryLegend

	t.Run("Can get the correct scale for a scale-2 legend", func(t *testing.T) {
		err := json.Unmarshal([]byte(jsonDataScale2), &legendScale2)
		if err != nil {
			panic(err)
		}

		expected := 3
		actual := GetMaxIntegerFromKeys(legendScale2["Scale-2 Risk (Rip)"].Category)

		if expected != actual {
			t.Errorf("Expected %d to equal %d", actual, expected)
		}
	})

	t.Run("Can get the correct scale for a scale-3 legend", func(t *testing.T) {
		err := json.Unmarshal([]byte(jsonDataScale3), &legendScale3)
		if err != nil {
			panic(err)
		}

		expected := 3
		actual := GetMaxIntegerFromKeys(legendScale3["Scale-3 Risk"].Category)

		if expected != actual {
			t.Errorf("Expected %d to equal %d", actual, expected)
		}
	})

	t.Run("Can get the correct scale for a scale-4 legend", func(t *testing.T) {
		err := json.Unmarshal([]byte(jsonDataScale4), &legendScale4)
		if err != nil {
			panic(err)
		}

		expected := 4
		actual := GetMaxIntegerFromKeys(legendScale4["Scale-4 Risk"].Category)

		if expected != actual {
			t.Errorf("Expected %d to equal %d", actual, expected)
		}
	})

	t.Run("Can get the correct scale for a scale-5 legend", func(t *testing.T) {
		err := json.Unmarshal([]byte(jsonDataScale5), &legendScale5)
		if err != nil {
			panic(err)
		}

		expected := 5
		actual := GetMaxIntegerFromKeys(legendScale5["Scale-5 Risk"].Category)

		if expected != actual {
			t.Errorf("Expected %d to equal %d", actual, expected)
		}
	})
}

func TestGetImageUrlForRiskInChicklet(t *testing.T) {
	jsonDataWithPeriod := `
{
  "SevereThunderstorm": {
    "name": "Severe Thunderstorm Risk",
    "periods": {
      "period1": {
        "imagePath": "/some/image/path"
      }
    }
  }
}`

	jsonDataInterpolatedPath := `{
  "SevereThunderstorm": {
    "name": "Severe Thunderstorm Risk",
    "periods": {
      "period4": {
        "imagePath": "/some/image/path"
      }
    }
  }
}`

	var lookupWithPeriod ChickletLookup
	var lookupWithInterpolatedPath ChickletLookup

	t.Run("GetImageUrlForRiskInChicklet with corresponding period", func(t *testing.T) {
		err := json.Unmarshal([]byte(jsonDataWithPeriod), &lookupWithPeriod)
		if err != nil {
			panic(err)
		}

		expected := "https://www.weather.gov/some/image/path"
		actual := GetImageURLForRiskInChicklet("SevereThunderstorm", 1, "ABC", lookupWithPeriod)

		if expected != actual {
			t.Errorf("Expected %s to equal %s", actual, expected)
		}
	})

	t.Run("GetImageUrlForRiskInChicklet with interpolated image path based on lookup key", func(t *testing.T) {
		err := json.Unmarshal([]byte(jsonDataInterpolatedPath), &lookupWithInterpolatedPath)
		if err != nil {
			panic(err)
		}

		expected := "https://www.weather.gov/images/ABC/ghwo/SevereThunderstormsDay2.jpg"
		actual := GetImageURLForRiskInChicklet(
			"SevereThunderstorm",
			2,
			"ABC",
			lookupWithInterpolatedPath,
		)

		if expected != actual {
			t.Errorf("\nExpected \n\t%s \nto equal \n\t%s", actual, expected)
		}
	})
}

func TestProcessOutputLegend(t *testing.T) {
	rawLegendJson := `{
  "hazards": [
    {
      "name": "Severe Thunderstorm Risk",
      "category": {
        "0": {
          "color": "#000",
          "levelName": "zero",
          "definition": "none"
        },
        "1": {
          "color": "#111",
          "levelName": "one",
          "definition": "some"
        },
        "2": {
          "color": "#222",
          "levelName": "two",
          "definition": "lots"
        }
      }
    },
    {
      "name": "Waterspout Risk",
      "category": {
        "0": {
          "color": "green",
          "levelName": "green",
          "definition": "green"
        },
        "1": {
          "color": "yellow",
          "levelName": "yellow",
          "definition": "yellow"
        },
        "2": {
          "color": "orange",
          "levelName": "orange",
          "definition": "orange"
        },
        "3": {
          "color": "red",
          "levelName": "red",
          "definition": "red"
        },
        "4": {
          "color": "purple",
          "levelName": "purple",
          "definition": "purple"
        }
      }
    },
    {
      "name": "Pasta",
      "category": {
        "0": {
          "color": "#fff",
          "levelName": "alfredo",
          "definition": "A cream sauce"
        },
        "1": {
          "color": "#f00",
          "levelName": "marinara",
          "definition": "A tomato sauce"
        }
      }
    }
  ]
}`
	var rawLegend SourceLegend
	var expectedLegend OutputSummaryLegend

	t.Run("Can process source legend into output legend", func(t *testing.T) {
		err := json.Unmarshal([]byte(rawLegendJson), &rawLegend)
		if err != nil {
			panic(err)
		}

		parseErr := json.Unmarshal([]byte(testProcessedLegendJson), &expectedLegend)
		if parseErr != nil {
			panic(err)
		}

		actualLegend := rawLegend.ProcessOutputLegend()

		if !reflect.DeepEqual(actualLegend, expectedLegend) {
			actual, e1 := json.MarshalIndent(actualLegend, "", "\t")
			if e1 != nil {
				panic(e1)
			}
			expected, e2 := json.MarshalIndent(expectedLegend, "", "\t")
			if e2 != nil {
				panic(e2)
			}
			t.Errorf("Expected %v to equal %v", string(actual), string(expected))
		}
	})

}

func TestRiskLevelNameFallbacks(t *testing.T) {
	t.Run("Risk LevelName fallbacks", func(t *testing.T) {
		/**
		* These tests cover the fallback mechanism for GHWO legend data.
		* We anticipate that at some point soon, GHWO legend.json data will
		* start furnishing data _without_ the `levelName` property in each
		* category dictionary.
		* Because of this forthcoming change, we workshopped a set of fallback
		* labels for each level within each possible risk factor scale.
		* These tests ensure that example legend data without the levelNames
		* will result in processed data that has the fallback values.
		 */
		t.Run("works for legend data with a 2-level scale", func(t *testing.T) {
			legendJson := `{
  "genration_time": "time",
  "generation_time_LT": "time_LT",
  "ghwo_version": "test",
  "hazards": [
    {
      "name": "Scale-2 Fallback Test",
      "category": {
        "0": {
          "color": "#000",
          "definition": "scale-2-zero"
        },
        "1": {
          "color": "#111",
          "definition": "scale-2-one"
        },
        "2": {
          "color": "#222",
          "definition": "scale-2-two"
        }
      }
    }
  ]
}`
			expectedJson := `{
  "ScaleFallbackTest": {
    "category": {
      "0": {
        "color": "#000",
        "definition": "scale-2-zero",
        "levelName": "None",
        "category": 0
      },
      "1": {
        "color": "#111",
        "definition": "scale-2-one",
        "levelName": "Moderate",
        "category": 1
      },
      "2": {
        "color": "#222",
        "definition": "scale-2-two",
        "levelName": "High",
        "category": 2
      }
    },
    "name": "Scale-2 Fallback Test",
    "scale": 2
  }
}`
			var legend SourceLegend
			var expected OutputSummaryLegend

			legendErr := json.Unmarshal([]byte(legendJson), &legend)
			if legendErr != nil {
				panic(legendErr)
			}
			expectedErr := json.Unmarshal([]byte(expectedJson), &expected)
			if expectedErr != nil {
				panic(expectedErr)
			}

			actual := legend.ProcessOutputLegend()

			if !reflect.DeepEqual(actual, expected) {
				actualStr, _ := json.MarshalIndent(actual, "", "\t")
				t.Errorf("Actual (%T) does not equal Expected (%T)", actual, expected)
				t.Errorf("Expected %s to equal %s", string(actualStr), expectedJson)
			}
		})

		t.Run("works for legend data with a 3-level scale", func(t *testing.T) {
			legendJson := `{
  "genration_time": "time",
  "generation_time_LT": "time_LT",
  "ghwo_version": "test",
  "hazards": [
    {
      "name": "Scale-3 Fallback Test",
      "category": {
        "0": {
          "color": "#000",
          "definition": "scale-3-zero"
        },
        "1": {
          "color": "#111",
          "definition": "scale-3-one"
        },
        "2": {
          "color": "#222",
          "definition": "scale-3-two"
        },
        "3": {
          "color": "#333",
          "definition": "scale-3-three"
        }
      }
    }
  ]
}`
			expectedJson := `{
  "ScaleFallbackTest": {
    "category": {
      "0": {
        "color": "#000",
        "definition": "scale-3-zero",
        "levelName": "None",
        "category": 0
      },
      "1": {
        "color": "#111",
        "definition": "scale-3-one",
        "levelName": "Low",
        "category": 1
      },
      "2": {
        "color": "#222",
        "definition": "scale-3-two",
        "levelName": "Moderate",
        "category": 2
      },
      "3": {
        "color": "#333",
        "definition": "scale-3-three",
        "levelName": "High",
        "category": 3
      }
    },
    "name": "Scale-3 Fallback Test",
    "scale": 3
  }
}`
			var legend SourceLegend
			var expected OutputSummaryLegend

			legendErr := json.Unmarshal([]byte(legendJson), &legend)
			if legendErr != nil {
				panic(legendErr)
			}
			expectedErr := json.Unmarshal([]byte(expectedJson), &expected)
			if expectedErr != nil {
				panic(expectedErr)
			}

			actual := legend.ProcessOutputLegend()

			if !reflect.DeepEqual(actual, expected) {
				actualStr, _ := json.MarshalIndent(actual, "", "\t")
				t.Errorf("Actual (%T) does not equal Expected (%T)", actual, expected)
				t.Errorf("Expected %s to equal %s", string(actualStr), expectedJson)
			}
		})

		t.Run("works with a 4-level scale", func(t *testing.T) {
			legendJson := `{
  "genration_time": "time",
  "generation_time_LT": "time_LT",
  "ghwo_version": "test",
  "hazards": [
    {
      "name": "Scale-4 Fallback Test",
      "category": {
        "0": {
          "color": "#000",
          "definition": "scale-4-zero"
        },
        "1": {
          "color": "#111",
          "definition": "scale-4-one"
        },
        "2": {
          "color": "#222",
          "definition": "scale-4-two"
        },
        "3": {
          "color": "#333",
          "definition": "scale-4-three"
        },
        "4": {
          "color": "#444",
          "definition": "scale-4-four"
        }
      }
    }
  ]
}`
			expectedJson := `{
  "ScaleFallbackTest": {
    "category": {
      "0": {
        "color": "#000",
        "definition": "scale-4-zero",
        "levelName": "None",
        "category": 0
      },
      "1": {
        "color": "#111",
        "definition": "scale-4-one",
        "levelName": "Very Low",
        "category": 1
      },
      "2": {
        "color": "#222",
        "definition": "scale-4-two",
        "levelName": "Low",
        "category": 2
      },
      "3": {
        "color": "#333",
        "definition": "scale-4-three",
        "levelName": "High",
        "category": 3
      },
      "4": {
        "color": "#444",
        "definition": "scale-4-four",
        "levelName": "Very High",
        "category": 4
      }
    },
    "name": "Scale-4 Fallback Test",
    "scale": 4
  }
}`
			var legend SourceLegend
			var expected OutputSummaryLegend

			legendErr := json.Unmarshal([]byte(legendJson), &legend)
			if legendErr != nil {
				panic(legendErr)
			}
			expectedErr := json.Unmarshal([]byte(expectedJson), &expected)
			if expectedErr != nil {
				panic(expectedErr)
			}

			actual := legend.ProcessOutputLegend()

			if !reflect.DeepEqual(actual, expected) {
				actualStr, _ := json.MarshalIndent(actual, "", "\t")
				t.Errorf("Actual (%T) does not equal Expected (%T)", actual, expected)
				t.Errorf("Expected %s to equal %s", string(actualStr), expectedJson)
			}
		})

		t.Run("works for legend data with a 5-level scale", func(t *testing.T) {
			legendJson := `{
  "genration_time": "time",
  "generation_time_LT": "time_LT",
  "ghwo_version": "test",
  "hazards": [
    {
      "name": "Scale-5 Fallback Test",
      "category": {
        "0": {
          "color": "#000",
          "definition": "scale-5-zero"
        },
        "1": {
          "color": "#111",
          "definition": "scale-5-one"
        },
        "2": {
          "color": "#222",
          "definition": "scale-5-two"
        },
        "3": {
          "color": "#333",
          "definition": "scale-5-three"
        },
        "4": {
          "color": "#444",
          "definition": "scale-5-four"
        },
        "5": {
          "color": "#555",
          "definition": "scale-5-five"
        }
      }
    }
  ]
}`
			expectedJson := `{
  "ScaleFallbackTest": {
    "category": {
      "0": {
        "color": "#000",
        "definition": "scale-5-zero",
        "levelName": "None",
        "category": 0
      },
      "1": {
        "color": "#111",
        "definition": "scale-5-one",
        "levelName": "Very Low",
        "category": 1
      },
      "2": {
        "color": "#222",
        "definition": "scale-5-two",
        "levelName": "Low",
        "category": 2
      },
      "3": {
        "color": "#333",
        "definition": "scale-5-three",
        "levelName": "Moderate",
        "category": 3
      },
      "4": {
        "color": "#444",
        "definition": "scale-5-four",
        "levelName": "High",
        "category": 4
      },
      "5": {
        "color": "#555",
        "definition": "scale-5-five",
        "levelName": "Very High",
        "category": 5
      }
    },
    "name": "Scale-5 Fallback Test",
    "scale": 5
  }
}`
			var legend SourceLegend
			var expected OutputSummaryLegend

			legendErr := json.Unmarshal([]byte(legendJson), &legend)
			if legendErr != nil {
				panic(legendErr)
			}
			expectedErr := json.Unmarshal([]byte(expectedJson), &expected)
			if expectedErr != nil {
				panic(expectedErr)
			}

			actual := legend.ProcessOutputLegend()

			if !reflect.DeepEqual(actual, expected) {
				actualStr, _ := json.MarshalIndent(actual, "", "\t")
				t.Errorf("Actual (%T) does not equal Expected (%T)", actual, expected)
				t.Errorf("Expected %s to equal %s", string(actualStr), expectedJson)
			}
		})
	})
}

func TestProcessDays(t *testing.T) {
	expectedJson := `[
  {
    "timestamp": "1978-09-17T12:00:00-05:00",
    "dayNumber": 1,
    "composite": {
      "max": 2,
      "scaled": 1
    },
    "risks": {
      "SevereThunderstorm": {
        "category": 2,
        "color": "#222",
        "levelName": "two",
        "definition": "lots"
      },
      "Meatball": {
        "category": 2
      }
    }
  },
  {
    "timestamp": "1978-10-01T14:00:00+00:00",
    "dayNumber": 2,
    "composite": {
      "max": 1,
      "scaled": 0.5
    },
    "risks": {
      "SevereThunderstorm": {
        "category": 1,
        "color": "#111",
        "levelName": "one",
        "definition": "some"
      },
      "Meatball": {
        "category": 1
      }
    }
  },
  {
    "timestamp": "1978-12-06T13:30:00+00:00",
    "dayNumber": 3,
    "composite": {
      "max": 3,
      "scaled": 0.6
    },
    "risks": {
      "SevereThunderstorm": {
        "category": 0,
        "color": "#000",
        "levelName": "zero",
        "definition": "none"
      },
      "Meatball": {
        "category": 3
      }
    }
  }
]`

	var processedLegend OutputSummaryLegend
	var testGHWOData SourceGHWOLocality

	// Load the processed legend into a struct
	legendErr := json.Unmarshal([]byte(testProcessedLegendJson), &processedLegend)
	if legendErr != nil {
		panic(legendErr)
	}
	dataErr := json.Unmarshal([]byte(testGHWODataJson), &testGHWOData)
	if dataErr != nil {
		panic(dataErr)
	}

	t.Run("it can process days", func(t *testing.T) {
		var expected []RiskDay
		expectedErr := json.Unmarshal([]byte(expectedJson), &expected)
		if expectedErr != nil {
			panic(expectedErr)
		}

		actual, _ := testGHWOData.GetRiskDays(processedLegend)

		if !reflect.DeepEqual(actual, expected) {
			actualStr, _ := json.MarshalIndent(actual, "", "\t")
			t.Errorf("Actual (%T) does not equal Expected (%T)", actual, expected)
			t.Errorf("Expected %s to equal %s", string(actualStr), expectedJson)
		}
	})

	t.Run("can process composite for risk day", func(t *testing.T) {
		var riskDayJson = `{
    "timestamp": "1978-12-06T13:30:00+00:00",
    "dayNumber": 3,
    "composite": {
      "max": 0,
      "scaled": 0
    },
    "risks": {
      "SevereThunderstorm": {
        "category": 0,
        "color": "#000",
        "levelName": "zero",
        "definition": "none"
      },
      "Meatball": {
        "category": 3
      }
    }
  }`
		var riskDay RiskDay
		var expectedComposite = RiskDayComposite{
			Max:    3,
			Scaled: 0.6,
		}
		err := json.Unmarshal([]byte(riskDayJson), &riskDay)
		if err != nil {
			panic(err)
		}

		riskDay.ProcessCompositeFromLegend(processedLegend)

		if !reflect.DeepEqual(riskDay.Composite, expectedComposite) {
			t.Errorf("Expected %v to equal %v", riskDay.Composite, expectedComposite)
		}

	})
}

func TestOutput(t *testing.T) {

	var legend OutputSummaryLegend
	var chicklet ChickletLookup

	legendErr := json.Unmarshal([]byte(testProcessedLegendJson), &legend)
	if legendErr != nil {
		panic(legendErr)
	}
	chickletErr := json.Unmarshal([]byte(testChickletJson), &chicklet)
	if chickletErr != nil {
		panic(chickletErr)
	}

	var riskDays = []RiskDay{
		RiskDay{
			Timestamp: "1978-12-06T13:30:00+00:00",
			DayNumber: 1,
			Composite: RiskDayComposite{
				Max:    2,
				Scaled: 1,
			},
			Risks: map[RiskTypeKey]*OutputCategory{
				"SevereThunderstorm": &OutputCategory{
					Color:      "blue",
					Definition: "lots 'o thunder",
					LevelName:  "Moderate",
					Category:   2,
				},
				"Waterspout": &OutputCategory{
					Color:      "aqua",
					Definition: "don't sail near this",
					LevelName:  "Low",
					Category:   1,
				},
			},
		},
		RiskDay{
			Timestamp: "1978-12-07T13:30:00+00:00",
			DayNumber: 2,
			Composite: RiskDayComposite{
				Max:    3,
				Scaled: 2.2,
			},
			Risks: map[RiskTypeKey]*OutputCategory{
				"SevereThunderstorm": &OutputCategory{
					Color:      "blue",
					Definition: "lots 'o thunder",
					LevelName:  "Moderate",
					Category:   2,
				},
				"Waterspout": &OutputCategory{
					Color:      "aqua",
					Definition: "don't sail near this",
					LevelName:  "Swirlin'",
					Category:   3,
				},
			},
		},
	}

	t.Run("processes the overall composite", func(t *testing.T) {
		var expected = []ExtendedRiskDayComposite{
			ExtendedRiskDayComposite{
				Max:       2,
				Scaled:    1,
				Timestamp: "1978-12-06T13:30:00+00:00",
			},
			ExtendedRiskDayComposite{
				Max:       3,
				Scaled:    2.2,
				Timestamp: "1978-12-07T13:30:00+00:00",
			},
		}

		output := Output{
			Days: riskDays,
		}

		output.ProcessComposite()

		if !reflect.DeepEqual(output.Composite.Days, expected) {
			expectedStr, _ := json.MarshalIndent(expected, "", "  ")
			actualStr, _ := json.MarshalIndent(output.Composite.Days, "", "  ")
			t.Errorf(
				"Expected %s to equal %s",
				string(actualStr),
				string(expectedStr),
			)
		}
	})

	t.Run("AddTopLevelRisksAndLegend", func(t *testing.T) {

		t.Run("adds expected OutputRisk list", func(t *testing.T) {
			var wfo = "ABC"

			var expected = map[RiskTypeKey]*OutputRisk{
				"Waterspout": &OutputRisk{
					Name: "Waterspout Risk",
					Days: []ExtendedOutputCategory{
						ExtendedOutputCategory{
							Color:      "aqua",
							Definition: "don't sail near this",
							LevelName:  "Low",
							Category:   1,
							Image:      "https://www.weather.gov/images/ABC/ghwo/WaterspoutDay1.jpg",
							Timestamp:  "1978-12-06T13:30:00+00:00",
						},
						ExtendedOutputCategory{
							Color:      "aqua",
							Definition: "don't sail near this",
							LevelName:  "Swirlin'",
							Category:   3,
							Image:      "https://www.weather.gov/images/ABC/ghwo/WaterspoutDay2.jpg",
							Timestamp:  "1978-12-07T13:30:00+00:00",
						},
					},
					Legend: &OutputLegend{
						Name:  "Waterspout Risk",
						Scale: 4,
						Category: map[CategoryKey]*OutputCategory{
							"0": &OutputCategory{
								Category:   0,
								Color:      "green",
								LevelName:  "green",
								Definition: "green",
							},
							"1": &OutputCategory{
								Category:   1,
								Color:      "yellow",
								LevelName:  "yellow",
								Definition: "yellow",
							},
							"2": &OutputCategory{
								Category:   2,
								Color:      "orange",
								LevelName:  "orange",
								Definition: "orange",
							},
							"3": &OutputCategory{
								Category:   3,
								Color:      "red",
								LevelName:  "red",
								Definition: "red",
							},
							"4": &OutputCategory{
								Category:   4,
								Color:      "purple",
								LevelName:  "purple",
								Definition: "purple",
							},
						},
					},
				},
				"SevereThunderstorm": &OutputRisk{
					Name: "Severe Thunderstorm Risk",
					Days: []ExtendedOutputCategory{
						ExtendedOutputCategory{
							Color:      "blue",
							Definition: "lots 'o thunder",
							LevelName:  "Moderate",
							Category:   2,
							Image:      "https://www.weather.gov/images/SevereThunderstormFromChicklet1.jpg",
							Timestamp:  "1978-12-06T13:30:00+00:00",
						},
						ExtendedOutputCategory{
							Color:      "blue",
							Definition: "lots 'o thunder",
							LevelName:  "Moderate",
							Category:   2,
							Image:      "https://www.weather.gov/images/SevereThunderstormFromChicklet2.jpg",
							Timestamp:  "1978-12-07T13:30:00+00:00",
						},
					},
					Legend: &OutputLegend{
						Name:  "Severe Thunderstorm Risk",
						Scale: 2,
						Category: map[CategoryKey]*OutputCategory{
							"0": &OutputCategory{
								Category:   0,
								Color:      "#000",
								LevelName:  "zero",
								Definition: "none",
							},
							"1": {
								Category:   1,
								Color:      "#111",
								LevelName:  "one",
								Definition: "some",
							},
							"2": {
								Category:   2,
								Color:      "#222",
								LevelName:  "two",
								Definition: "lots",
							},
						},
					},
				},
			}

			output := Output{}

			output.AddTopLevelRisksAndLegend(wfo, riskDays, legend, chicklet)

			if !reflect.DeepEqual(output.Risks, expected) {
				actualStr, _ := json.MarshalIndent(output.Risks, "", "  ")
				expectedStr, _ := json.MarshalIndent(expected, "", "  ")
				t.Errorf(
					"expected %s to equal %s",
					string(actualStr),
					string(expectedStr),
				)
			}
		})

		t.Run("adds expected OutputSummaryLegend as top level legend", func(t *testing.T) {
			var wfo = "ABC"

			// The expected top level summary legend here should only have
			// entries for SevereThunderstorm and Waterspout, per the test data
			var expected = make(OutputSummaryLegend)
			for key, val := range legend {
				if key == "SevereThunderstorm" || key == "Waterspout" {
					expected[key] = val
				}
			}

			var output = Output{}

			output.AddTopLevelRisksAndLegend(
				wfo,
				riskDays,
				legend,
				chicklet,
			)

			if !reflect.DeepEqual(output.Legend, expected) {
				expectedStr, _ := json.MarshalIndent(expected, "", "  ")
				actualStr, _ := json.MarshalIndent(output.Legend, "", "  ")
				t.Errorf("Expected %s to equal %s",
					string(actualStr),
					string(expectedStr),
				)
			}
		})

	})
}

func TestProcessCounty(t *testing.T) {
	/**
	* With these tests, we are ensuring the the overall processing
	* of county data based on static example input files
	* (ie saved hazByCounty, legend, and chicklet files)
	* can produce a struct with the output JSON that is
	* equal to that of a saved example result file
	 */
	var sourceHazByCountyPath = "test_data/LWX_hazByCounty.json"
	var sourceLegendPath = "test_data/LWX_legend.json"
	var sourceChickletPath = "test_data/LWX_chicklet.json"
	var sourceExpectedCountyPath = "test_data/county_51013.json"

	hazByCountyBytes, err := os.ReadFile(sourceHazByCountyPath)
	if err != nil {
		t.Error(err)
	}
	legendBytes, err := os.ReadFile(sourceLegendPath)
	if err != nil {
		t.Error(err)
	}
	chickletBytes, err := os.ReadFile(sourceChickletPath)
	if err != nil {
		t.Error(err)
	}
	expectedCountyBytes, err := os.ReadFile(sourceExpectedCountyPath)
	if err != nil {
		t.Error(err)
	}

	var hazByCounty SourceGHWOData
	var legend SourceLegend
	var chicklet SourceChicklet

	// We unmarshal the expected json into a generic interface,
	// for later comparison
	var expectedCountyOutput Output
	err = json.Unmarshal(expectedCountyBytes, &expectedCountyOutput)
	if err != nil {
		t.Errorf("Could not unmarshal the expected county json: %s", err)
	}

	err = json.Unmarshal(hazByCountyBytes, &hazByCounty)
	if err != nil {
		t.Error(err)
	}
	err = json.Unmarshal(legendBytes, &legend)
	if err != nil {
		t.Error(err)
	}
	err = json.Unmarshal(chickletBytes, &chicklet)
	if err != nil {
		t.Error(err)
	}

	t.Run("Processes test data into the expected county result", func(t *testing.T) {
		// Remember to set the WFO on the source data
		hazByCounty.WFO = "lwx"
		actual := *GetProcessedCounty(
			"51013",
			&hazByCounty,
			legend.ProcessOutputLegend(),
			chicklet.GetRiskToHazardLookup(),
		)

		actualAsJson, err := json.MarshalIndent(actual, "", "  ")
		if err != nil {
			t.Errorf("Could not marshal the actual result into json: %s", err)
		}
		expectedAsJson, err := json.MarshalIndent(expectedCountyOutput, "", "  ")
		if err != nil {
			t.Errorf("Could not marshal the expected struct into json: %s", err)
		}
		// Now, we unmarshal the actual result json back into a generic
		// interface, for comparison with our expected value
		err = json.Unmarshal(actualAsJson, &actual)
		if err != nil {
			t.Errorf("Could not unmarshal actual into generic interface: %s", err)
		}

		// We need to sort the NoRisks slice, otherwise
		// the comparison will fail
		slices.Sort(actual.NoRisks)
		slices.Sort(expectedCountyOutput.NoRisks)

		if !reflect.DeepEqual(actual, expectedCountyOutput) {
			t.Errorf("Expected %s \n to equal %s", string(actualAsJson), string(expectedAsJson))
		}
	})
}
