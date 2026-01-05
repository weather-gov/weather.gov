# We will use Redis for caching interop API data fetching requests
  
  Date: 2025-01-05
    
### Status
  
Draft
  
### Context
Due to the number of requests made to the NWS API for a single point forecast page, and the size of the results from each of these constituent requests, we need an intelligent form of caching to reduce page loads in high traffic environments.
  
We are already using some forms of caching in the interop layer, including:
* Prefetching and caching alerts every 60s
* Prefetching and caching GHWO data for all WFOs
  
There are several possible caching strategies we could employ when it comes to the other interop/API data. These are:
1. Cache interop endpoint results that are sent to consumers. This means caching the processed data results for each interop endpoint that a consumer might request. For example, we could cache the results of the `/point/<lat>,<lon>` interop endpoint which includes all processed data needed by the django application. The shortcoming here would be running into potential issues with hourly forecast alignment (stale data) and determining the correct TTLs;
2. The various data fetching functions that exist within the interop. These would have the same shortcomings as above, but the additional advantage would be to re-use any nested data fecthing or processing calls between data sources;
3. Cache only external NWS API data fetches, and set the TTL for each request to that which is returned by the Cache headers from the API.
  
### Decision
We will use Redis for quick key/value caching of interop data. We will use caching strategy (3) above.
  
### Consequences
- We will need to add redis as a docker container in our local development configurations
- We will need to add redis to terraform configurations, so that it can run correctly in live environments
- We will need to have a way of disabling redis usage without affecting other parts of the application
- Adding a new app to our cloud-gov environment could result in additional resource/credit usage
