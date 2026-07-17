package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"tasks/internal/ghwo"
)

func main() {
	var inputDataPath string
	var inputLegendPath string
	var inputChickletPath string

	var wfo string
	var info string
	var remote bool

	var county string
	var state string

	flag.StringVar(&inputDataPath, "data-path", "", "path to a hazByCounty.json file")
	flag.StringVar(&inputLegendPath, "legend-path", "", "path to a legend.json file")
	flag.StringVar(&inputChickletPath, "chicklet-path", "", "path to a chicklet.json file")

	flag.StringVar(&wfo, "wfo", "", "WFO code")
	flag.StringVar(&info, "info", "", "Can be either 'state' or 'county'. Will output a list of the states or countyfips available in the data")

	flag.StringVar(&county, "county", "", "A county fips code. Will output the processed result for the given county")
	flag.StringVar(&state, "state", "", "A two letter state code. Will output the processed result for the given state")

	flag.BoolVar(&remote, "remote", false, "Whether or not to fetch the data remotely")

	flag.Parse()

	// Validate the arguments
	var argErrors = make([]string, 0)
	if !remote {
		if inputDataPath == "" {
			argErrors = append(
				argErrors,
				"Missing data-path (hazByCounty.json or equivalent)",
			)
		}
		if inputLegendPath == "" {
			argErrors = append(
				argErrors,
				"Missing legend-path (legend.json or equivalent)",
			)
		}
		if inputChickletPath == "" {
			argErrors = append(
				argErrors,
				"Missing chicklet-path (chicklet.json or equivalent)",
			)
		}
	}
	if wfo == "" {
		argErrors = append(
			argErrors,
			"Missing wfo",
		)
	}
	if info == "" && county == "" && state == "" {
		argErrors = append(
			argErrors,
			"You must specify _either_ the --info argument OR one of --state or --county",
		)
	}

	if info != "" && (state != "" || county != "") {
		argErrors = append(
			argErrors,
			"Cannot specify values for both info and state/county",
		)
	}

	if len(argErrors) > 0 {
		for _, msg := range argErrors {
			fmt.Println(msg)
		}
		os.Exit(-1)
	}

	// There are probably more combinations, but this is just for testing
	// stuff out so I won't bother for now
	ghwoData := getHazByCountyData(remote, wfo, inputDataPath)
	legend := getLegendData(remote, wfo, inputLegendPath)
	chicklet := getChickletData(remote, wfo, inputChickletPath)

	// Set the WFO on the source data
	ghwoData.WFO = wfo

	// Get the processed versions of the chicklet
	// and legend
	processedLegend := legend.ProcessOutputLegend()
	chickletLookup := chicklet.GetRiskToHazardLookup()

	if info != "" {
		displayInfoForData(info, ghwoData)
	} else if state != "" {
		outputState(state, ghwoData, legend, chicklet)
	} else if county != "" {
		outputCounty(county, ghwoData, processedLegend, chickletLookup)
	}

}

func outputState(state string, ghwoData *ghwo.SourceGHWOData, legend *ghwo.SourceLegend, chicklet *ghwo.SourceChicklet) {
	stateData, ok := ghwoData.States[state]
	if !ok {
		fmt.Printf("State %s is not available in the source data", state)
	} else {
		fmt.Printf("%v\n", stateData)
	}
}

func outputCounty(county string, ghwoData *ghwo.SourceGHWOData, legend ghwo.OutputSummaryLegend, chicklet ghwo.ChickletLookup) {
	result := ghwo.GetProcessedCounty(
		county,
		ghwoData,
		legend,
		chicklet,
	)

	str, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		panic(err)
	}

	fmt.Println(string(str))
}

func displayInfoForData(info string, data *ghwo.SourceGHWOData) {
	if info == "state" {
		fmt.Println("The following states are available:")
		for key, _ := range data.States {
			fmt.Printf("\t%s\n", key)
		}
	} else if info == "county" {
		fmt.Println("The following counties are available:")
		for key, _ := range data.Counties {
			fmt.Printf("\t%s\n", key)
		}
	}
}

func getHazByCountyData(remote bool, wfo string, path string) *ghwo.SourceGHWOData {
	var result *ghwo.SourceGHWOData
	if remote {
		url := fmt.Sprintf("https://www.weather.gov/source/%s/ghwo/hazByCounty.json", wfo)
		fetchAndUnmarshal(url, &result)
	} else {
		getAndUnmarshalDataFile(path, &result)
	}
	return result
}

func getLegendData(remote bool, wfo string, path string) *ghwo.SourceLegend {
	var result *ghwo.SourceLegend
	if remote {
		url := fmt.Sprintf("https://www.weather.gov/source/%s/ghwo/legend.json", wfo)
		fetchAndUnmarshal(url, &result)
	} else {
		getAndUnmarshalDataFile(path, &result)
	}
	return result
}

func getChickletData(remote bool, wfo string, path string) *ghwo.SourceChicklet {
	var result *ghwo.SourceChicklet
	if remote {
		url := fmt.Sprintf("https://www.weather.gov/source/%s/ghwo/chicklet.json", wfo)
		fetchAndUnmarshal(url, &result)
	} else {
		getAndUnmarshalDataFile(path, &result)
	}
	return result
}

func getAndUnmarshalDataFile(path string, out any) {
	bytes, err := os.ReadFile(path)
	if err != nil {
		log.Fatalf("Could not open data file %s: %s", path, err)
	}

	err = json.Unmarshal(bytes, out)
	if err != nil {
		log.Fatalf("Could not unmarshal file %s: %s", path, err)
	}
}

func fetchAndUnmarshal(url string, out any) {
	fmt.Printf("Fetching %s...\n", url)
	resp, err := http.Get(url)
	if err != nil {
		log.Fatalf("Could not retrieve %s: %s", url, err)
	}

	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Fatalf("Could not read response body %s", err)
	}

	err = json.Unmarshal(body, out)
	if err != nil {
		log.Fatalf("Could not unmarshal string %s\nErr: %s", string(body), err)
	}
}
