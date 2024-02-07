# Spatial data

We store certain geospatial data in our own database and use it for some basic
geospatial queries. In order for the site to work correctly locally, the data
needs to be loaded first. The spatial data is stored in our repo using
[git LFS](https://www.atlassian.com/git/tutorials/git-lfs).

1. Install and enable git LFS.

   - **Linux**: [download instructions](https://docs.github.com/en/repositories/working-with-files/managing-large-files/installing-git-large-file-storage?platform=linux)
   - **Windows**: [download instructions](https://docs.github.com/en/repositories/working-with-files/managing-large-files/installing-git-large-file-storage?platform=windows)
   - **macOS**: the easiest way is to use Homebrew and run
     ```sh
     brew install git-lfs
     ```
     Alternatively, there are manual [download instructions](https://docs.github.com/en/repositories/working-with-files/managing-large-files/installing-git-large-file-storage?platform=mac).

2. Enable git LFS on your local machine by running

   ```sh
   git lfs install
   ```

3. Ensure your Docker containers are already running. The script to load spatial
   data expects our database container to be available
   ```
   docker compose up -d
   ```

4. Load the spatial data into your local database by running
   ```sh
   make load-spatial
   ```

## Loading data into cloud environments

Ensure you have the spatial data in your project in the `spatial-data` directory.
If not, run `git lfs pull` to fetch it. Then, log into cloud.gov:

```sh
 cf login --sso -a api.fr.cloud.gov
```

And then run this utility script, indicating which environment you want to load
data into.

```sh
./scripts/load-spatial-data.sh <environment>
```
