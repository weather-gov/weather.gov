package data

func GetAFDVersions() ([]byte, int, error) {
	return FetchAPI("/products/types/AFD")
}

func GetAFDVersionsByWFO(wfo string) ([]byte, int, error) {
	return FetchAPI("/products/types/AFD/locations/" + wfo)
}
