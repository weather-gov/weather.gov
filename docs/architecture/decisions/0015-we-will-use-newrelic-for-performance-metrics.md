# We will use New Relic for Application Performance Metrics (APMs)
Date: 2024-02-06

### Status

Accepted

### Context

We want to monitor the performance of our application and its dependencies like datastores and external APIs. New Relic offers a free service for APM monitoring. The cloud.gov PHP buildpack offers a way to enable using this service by attaching your license. Since it is easy and free to start using New Relic to gather application metrics, we are enabling this feature in order to track performance. We are also monitoring how performance changes after deployments. 

### Decision

- We will use New Relic (free) for APM tracking for our deployments. 

### Consequences

- We might not want to use New Relic if we end up using infrastructure other than the cloud.gov PHP buildpack. 
