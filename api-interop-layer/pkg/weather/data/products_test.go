package data

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	util_golang "weathergov/api-interop/pkg/weather"
)

func TestGetProduct_AFD(t *testing.T) {
	// Mock API
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/products/AFD-TEST" {
			fmt.Fprintln(w, `{
				"id": "AFD-TEST",
				"productCode": "AFD",
				"productText": "000\nNOUS42 KWNO 010000\nAFDTEST\n\n.PREAMBLE...\nSome preamble text.\n\n.SYNOPSIS...\nSynopsis content.\n\n$$"
			}`)
			return
		}
		w.WriteHeader(404)
	}))
	defer ts.Close()

	originalClient := util_golang.HTTPClient
	util_golang.HTTPClient = &http.Client{
		Transport: &testTransport{
			Transport: http.DefaultTransport,
			TargetURL: ts.URL,
		},
	}
	defer func() { util_golang.HTTPClient = originalClient }()

	prod, err := GetProduct("AFD-TEST")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if prod.ProductCode != "AFD" {
		t.Errorf("expected AFD, got %s", prod.ProductCode)
	}

	// Check parsed content
	parsed, ok := prod.ParsedProductText.(AFDStructure)
	if !ok {
		// It might be pointer or struct interface?
		// GetProducts assigns parser.GetStructureForTwig() -> AFDStructure (struct)
		// So checking if it works.
		t.Fatalf("expected AFDStructure, got %T", prod.ParsedProductText)
	}

	if len(parsed.Body) == 0 {
		// We expect .SYNOPSIS... to be parsed into body
		t.Error("expected body content")
	}

	// Check Header
	if parsed.Body[0].Type != "header" || parsed.Body[0].Content != "PREAMBLE" {
		t.Errorf("expected PREAMBLE header, got %v", parsed.Body[0])
	}
}

func TestGetProduct_Generic(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/products/OTHER" {
			fmt.Fprintln(w, `{
				"id": "OTHER",
				"productCode": "OTHER",
				"productText": "Some text"
			}`)
			return
		}
		w.WriteHeader(404)
	}))
	defer ts.Close()

	originalClient := util_golang.HTTPClient
	util_golang.HTTPClient = &http.Client{
		Transport: &testTransport{
			Transport: http.DefaultTransport,
			TargetURL: ts.URL,
		},
	}
	defer func() { util_golang.HTTPClient = originalClient }()

	prod, err := GetProduct("OTHER")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if prod.ParsedProductText != nil {
		t.Error("expected no parsing for other products")
	}
}
