package main

import (
	"context"
	"fmt"
	"os"
	"strings"
	"sync"
	"tasks/internal/ghwo"
)

func main() {
	args := os.Args[1:]

	var wfos = validateArgs(args)

	wg := sync.WaitGroup{}
	resultChan := make(chan *ghwo.FetchResult, len(wfos))
	wg.Add(len(wfos))

	ctx := context.TODO()

	fmt.Printf("Fetching from %d WFOS:\n", len(wfos))

	for _, wfo := range wfos {
		fmt.Printf("\t%s\n", strings.ToUpper(wfo))
		go ghwo.FetchWFO(ctx, wfo, resultChan, &wg)
	}

	wg.Wait()
	close(resultChan)

	for _ = range len(resultChan) {
		showResult(<-resultChan)
	}
}

func validateArgs(args []string) []string {
	if len(args) != 1 {
		fmt.Printf("You must provide a valid WFO or comma-separated list of wfos  as the single argument; provided %v", args)
		os.Exit(0)
	}

	// If there is a single arg and it is exacly "all"
	// Then we attempt to fetch all WFOs from the const
	// list
	if args[0] == "all" {
		return ghwo.WFOs
	}

	split := strings.Split(args[0], ",")
	invalid := make([]string, 0)
	for _, wfo := range split {
		if len(wfo) != 3 {
			invalid = append(invalid, wfo)
		}
	}

	if len(invalid) > 0 {
		fmt.Printf("You provided the following invalid WFO args:\n")
		for _, invalidStr := range invalid {
			fmt.Printf("\t%s\n", invalidStr)
		}
		fmt.Printf("Please provide a single arg with a wfo, or multiple wfos separated by commas (no spaces)")
		os.Exit(0)
	}

	return split
}

func showResult(result *ghwo.FetchResult) {
	fmt.Printf("\n==========\n")
	fmt.Println(strings.ToUpper(result.WFO))
	if len(result.Errors) > 0 {
		fmt.Printf("==========\n")
		fmt.Printf("Encountered one or more errors:\n")
		for _, err := range result.Errors {
			fmt.Printf("\t%s\n", err)
		}
		fmt.Printf("==========\n")
	} else {
		fmt.Printf("==========\n")
		fmt.Printf("Successfully fetched data for %s\n", result.WFO)
		fmt.Printf("==========\n")
		fmt.Printf("\tCounties: %d\n", len(result.GHWOData.Counties))

		if len(result.States) > 0 {
			showStateInfo(result.States)
		}
	}
}

func showStateInfo(states map[ghwo.LocalityCode]*ghwo.StateFetchResult) {
	fmt.Printf("\tStates: %d\n", len(states))
	fmt.Printf("== State Info (%d states in data)\n", len(states))
	for stateAbbrev, stateInfo := range states {
		if len(stateInfo.Errors) > 0 {
			fmt.Printf("== \tErrors for %s\n", stateAbbrev)
			for _, error := range stateInfo.Errors {
				fmt.Printf("==\t\t= %s\n", error)
			}
		} else {
			fmt.Printf("== \t\t%s: Success\n", stateAbbrev)
		}
	}
}
