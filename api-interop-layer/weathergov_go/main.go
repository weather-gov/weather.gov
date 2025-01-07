package main

import (
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"log"
	"fmt"
        "os"
	"github.com/twpayne/go-geos"
)


func connectToDb(user string,  pass string) (*gorm.DB, error) {
	dsn := fmt.Sprintf("%s:%s@tcp(0.0.0.0:3306)/weathergov?charset=utf8mb4&parseTime=True&loc=Local", user, pass)
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	return db, err
}

func main(){
        dbUsername, dbUsernameFound := os.LookupEnv("DB_USER")
        if(!dbUsernameFound){
                log.Fatal("You must provide a db username via the DB_USER env var")
                
        }

        dbPass, dbPassFound := os.LookupEnv("DB_PASS")
        if(!dbPassFound){
                log.Fatal("You must provide a db password via the DB_PASS env var")
        }

	db, err := connectToDb(dbUsername, dbPass)
	if(err != nil){
		log.Fatal(err)
	}
	var result string
	queryString := `SELECT ST_ASGEOJSON(
        ST_COLLECT(shape)
      )
        AS shape
        FROM weathergov_geo_zones
        WHERE id IN ('https://api.weather.gov/zones/forecast/AKZ317','https://api.weather.gov/zones/forecast/AKZ318','https://api.weather.gov/zones/forecast/AKZ319','https://api.weather.gov/zones/forecast/AKZ320','https://api.weather.gov/zones/forecast/AKZ321','https://api.weather.gov/zones/forecast/AKZ322','https://api.weather.gov/zones/forecast/AKZ323','https://api.weather.gov/zones/forecast/AKZ324','https://api.weather.gov/zones/forecast/AKZ325','https://api.weather.gov/zones/forecast/AKZ326','https://api.weather.gov/zones/forecast/AKZ327','https://api.weather.gov/zones/forecast/AKZ328','https://api.weather.gov/zones/forecast/AKZ329','https://api.weather.gov/zones/forecast/AKZ330','https://api.weather.gov/zones/forecast/AKZ331','https://api.weather.gov/zones/forecast/AKZ332')`
	db.Raw(queryString).Scan(&result)
	fmt.Println(len(result))

	geom, geoErr := geos.NewGeomFromGeoJSON(result)
	if(geoErr != nil){
		log.Fatal(geoErr)
	}

        // Perform the union, but don't
        // do anything with the result for now.
        // We just want to time it
	geom.UnaryUnion()

	// Finish
	fmt.Println("Complete!")
}
