# Counties with multiple WFOs #
We have found that some counties are associated with multiple WFOs. This presents problems specifically when trying to fetch GHWO data, where the source files are organized by WFO.
  
## Queries for multi-WFO counties ##
The following query should return information about all the counties we know about that are associated with multiple WFOs, including what all the WFOs are for each of these counties:
```sql
-- WORKS FOR MULTI_COUNTIES
SELECT c.countyname, c.countyfips, string_agg(w.wfo, ',')
FROM weathergov_geo_counties c
INNER JOIN
      (SELECT weathercounties_id, COUNT(*)
      FROM weathergov_geo_counties_cwas
      GROUP BY weathercounties_id
      HAVING COUNT(*) > 1) a ON c.id=a.weathercounties_id
INNER JOIN weathergov_geo_counties_cwas j ON j.weathercounties_id=c.id
INNER JOIN weathergov_geo_cwas w ON j.weathercountywarningareas_id=w.id
GROUP BY c.id;
```
  
Produces:
```
  countyname   | countyfips | string_agg  
----------------+------------+-------------
 Somerset       | 23025      | GYX,CAR
 Cayuga         | 36011      | BUF,BGM
 San Bernardino | 06071      | VEF,SGX,PSR
 Gila           | 04007      | PSR,FGZ
 Pinal          | 04021      | PSR,TWC
 Sierra         | 06091      | STO,REV
 Riverside      | 06065      | SGX,PSR
 Tuolumne       | 06109      | HNX,STO
 Nevada         | 06057      | STO,REV
 Alpine         | 06003      | STO,REV
 Plumas         | 06063      | STO,REV
 Lassen         | 06035      | REV,STO
 Modoc          | 06049      | MFR,REV
 El Dorado      | 06017      | STO,REV
 Placer         | 06061      | STO,REV
 Nye            | 32023      | VEF,LKN
 San Juan       | 49037      | GJT,SLC
```

## "Primary" WFOs for each multi-WFO county ##
By making GHWO requests for each WFO associated with each of these counties, we determined that it is always one and only one that has the GHWO data for the county. We call this the "primary" WFO for the county.
  
Here is the breakdown of multi-WFO counties and their primaries:
```json
[
  {
    name: "Somerset",
    fips: "23025",
    wfos: [ "CAR", "GYX" ],
    hasGHWOForCounty: { CAR: false, GYX: true }
  },
  {
    name: "Cayuga",
    fips: "36011",
    wfos: [ "BGM", "BUF" ],
    hasGHWOForCounty: { BGM: false, BUF: true }
  },
  {
    name: "San Bernardino",
    fips: "06071",
    wfos: [ "SGX", "PSR", "VEF" ],
    hasGHWOForCounty: { SGX: false, PSR: false, VEF: true }
  },
  {
    name: "Gila",
    fips: "04007",
    wfos: [ "FGZ", "PSR" ],
    hasGHWOForCounty: { FGZ: false, PSR: true }
  },
  {
    name: "Pinal",
    fips: "04021",
    wfos: [ "TWC", "PSR" ],
    hasGHWOForCounty: { TWC: false, PSR: true }
  },
  {
    name: "Sierra",
    fips: "06091",
    wfos: [ "REV", "STO" ],
    hasGHWOForCounty: { REV: false, STO: true }
  },
  {
    name: "Riverside",
    fips: "06065",
    wfos: [ "SGX", "PSR" ],
    hasGHWOForCounty: { SGX: true, PSR: false }
  },
  {
    name: "Tuolumne",
    fips: "06109",
    wfos: [ "HNX", "STO" ],
    hasGHWOForCounty: { HNX: true, STO: false }
  },
  {
    name: "Nevada",
    fips: "06057",
    wfos: [ "REV", "STO" ],
    hasGHWOForCounty: { REV: false, STO: true }
  },
  {
    name: "Alpine",
    fips: "06003",
    wfos: [ "REV", "STO" ],
    hasGHWOForCounty: { REV: false, STO: true }
  },
  {
    name: "Plumas",
    fips: "06063",
    wfos: [ "REV", "STO" ],
    hasGHWOForCounty: { REV: false, STO: true }
  },
  {
    name: "Lassen",
    fips: "06035",
    wfos: [ "REV", "STO" ],
    hasGHWOForCounty: { REV: true, STO: false }
  },
  {
    name: "Modoc",
    fips: "06049",
    wfos: [ "REV", "MFR" ],
    hasGHWOForCounty: { REV: false, MFR: true }
  },
  {
    name: "El Dorado",
    fips: "06017",
    wfos: [ "REV", "STO" ],
    hasGHWOForCounty: { REV: false, STO: true }
  },
  {
    name: "Placer",
    fips: "06061",
    wfos: [ "REV", "STO" ],
    hasGHWOForCounty: { REV: false, STO: true }
  },
  {
    name: "Nye",
    fips: "32023",
    wfos: [ "VEF", "LKN" ],
    hasGHWOForCounty: { VEF: true, LKN: false }
  },
  {
    name: "San Juan",
    fips: "49037",
    wfos: [ "GJT", "SLC" ],
    hasGHWOForCounty: { GJT: true, SLC: false }
  }
]
```
