package data

import (
	"encoding/json"
	"fmt"
	util_golang "weathergov/util-golang"
)

type ProductResponse struct {
	ID          string `json:"id"`
	ProductCode string `json:"productCode"`
	ProductText string `json:"productText"`
	Status      int    `json:"status,omitempty"` // API returns status?

	// Parsed fields
	ParsedProductText interface{} `json:"parsedProductText,omitempty"`
}

func GetProduct(id string) (*ProductResponse, error) {
	path := fmt.Sprintf("/products/%s", id)
	res, err := util_golang.FetchAPIJson(path)
	if err != nil {
		return nil, err
	}

	// Marshal/Unmarshal to struct
	b, _ := json.Marshal(res)
	var product ProductResponse
	_ = json.Unmarshal(b, &product)

	// TS: if (productData.status && productData.status !== 200)
	// My FetchAPIJson usually handles 200 checks?
	// But API response might contain "status" field?
	// If struct has "status", check it.
	if product.Status != 0 && product.Status != 200 {
		return &product, nil
	}

	if product.ProductCode == "AFD" {
		parser := NewAFDParser(product.ProductText)
		parser.Parse()
		product.ParsedProductText = parser.GetStructureForTwig()
	}

	return &product, nil
}
