package main

import (
	"weathergov/alerts/fetch"
	"weathergov/alerts/processing"
	"fmt"
)

func main(){
	alerts := fetch.FetchAlerts()
	for i := 0; i < len(alerts); i++ {
		alert := alerts[i]
		hash := processing.HashAlertFeature(&alert)
		fmt.Println(hash)
	}
}
