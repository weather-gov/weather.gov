# Background Tasks

This directory contains a [Golang](https://go.dev) project that implements background tasks necessary for beta.weather.gov data updates.

## Setup and Dependencies
Currently, we use Go version `1.26.5`.

### Folder structure
| top level dir | description |
|---------------|-------------|
| `cmd`       | Containing folder for individual binary main files. For example `alerts/main.go`. Each `cmd/<task>/main.go` should stay a thin runner — task logic and types live in `internal/<task>` |
| `bin`         | Directory where all compiled binaries will be placed |
| `internal` | Shared packages and code that we write, which can be used across the programs in `cmd`. Go enforces that nothing outside this module can import these packages |

### Docker ###
To keep things consistent, we have added a new docker container for all go operations, and linked a volume to this project directory. Therefore all commands can go through the docker container (see below).

If you wish to manually run any commands on the container yourself, outside of the provided justfile commands, you can do the following:
```bash
docker compose run --rm tasks-dev <the-rest-of-your-command>
```

## `justfile` and updated commands list
We have added convenience commands to the root justfile of this repository:
| command | description |
|---------------|-----------------|
| `just lets <args>` | Runs everything in `<args>` in the context of a single run of the golang container. For example, `just lets go help` will run the `go help` command within the golang container |
| `just go-run-ghwo` | Run (interpreted) the GHWO program |
| `just go-run-alerts` | Run (interpreted) the alerts program |
| `just go-build-ghwo` | Compile the GHWO program and place the binary at `tasks/bin/ghwo` |
| `just go-build-alerts` | Compile the alerts program and place the binary at `tasks/bin/alerts` |
| `just go-test` (or `just test-go`) | Run all tests in `tasks/` (`go test -v ./...`) inside the go container |
| `just go-imports` | Format the files in the project. Modifies files in place, and will display the names of any changed files |
| `just go-run-wpcprob` | Build `wgrib2` and the `wpcprob-tasks` image, then run the WPC probabilistic precip program |

## Description of Tasks
### Alerts
The alerts processing task.

This program, which runs every 30s, will fetch the latest alerts across the country and update our own alerts cache database table.

### GHWO (a.k.a Risk Overviews)
The Graphical Hazardous Weather Outlook (GHWO, also known as Risks Overview) processing task.

This program, which runs every 30m, will fetch all GHWO data from all the WFOs that we know about, process the information into a structure that we find useful, and save these records into our database.

### WPC Probabilistic Precipitation ###
Runs hourly. Downloads NOAA WPC's probabilistic precipitation/snow/freezing-rain GRIB2 products, maps each grid cell to an NDFD `(wfo, x, y)` gridpoint, and loads the results into `weathergov_wpc_prob_precip`.

- Code layout: `cmd/wpcprob/main.go` just orchestrates the steps. The actual GRIB decoding, projection math, and DB logic live in `internal/wpcprob`.
- Database: connects via `internal.NewDBPool`, which reads `DATABASE_URL` if set, otherwise builds one from `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USERNAME` / `DB_PASSWORD` — defaulting to the local docker-compose values if none are set.
- Running it locally: `just go-run-wpcprob` builds the `wgrib2` binary and the standalone `wpcprob-tasks` image, then runs the program. That's the only command you need.

#### wgrib2 ####
`wgrib2` isn't packaged for Debian/Ubuntu, so we build it from source

- `Dockerfile.wgrib2` builds [NCEPLIBS-g2c](https://github.com/NOAA-EMC/NCEPLIBS-g2c) and [wgrib2](https://github.com/NOAA-EMC/wgrib2) into a static binary with JPEG2000 support
- The binary has no runtime library dependencies, so it also works outside Docker
