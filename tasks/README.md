# Background Tasks #

This directory contains a [Golang](https://go.dev) project that implements our various background tasks.
  
## Setup and Dependencies ##
Currently, we are using Go version `1.26.5`
  
### Folder structure ###
| top level dir | description |
|---------------|-------------|
| `cmd`       | Containing folder for individual binary main files. For example `alerts/main.go` |
| `bin`         | Directory where all compiled binaries will be placed |
| `common` | Shared internal packages and code that we write, which can be used across the programs in `cmd` |
  
### Docker ###
To keep things consistent, we have added a new docker container for all go operations, and linked a volume to this project directory. Therefore all commands can go through the docker container (see below).
  
If you wish to manually run any commands on the container yourself, outside of the provided justfile commands, you can do the following:
```bash
docker compose run --rm golang-tasks <the-rest-of-your-command>
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
| `just go-fmt` | Format the files in the project according to `gofmt`. Will modify files in place, and will display the names of any changed files |

## Description of Tasks ##
### Alerts ###
The alerts processing task.
  
This program, which should run every 60s, will fetch the latest alerts across the country and update our own alerts cache database table.
  
### GHWO (a.k.a Risks) ###
The Graphical Hazardoud Weather Outlook (GHWO, also known as Risks) processing task.
  
This program, which should run every hour, will fetch all GHWO data from all the WFOs that we know about, process the information into a structure that we find useful, and dump the records into our database
  

