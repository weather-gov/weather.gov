# We will use cloud.gov for hosting our MVP 

Date: 2023-10-11

### Status

Accepted

### Context

We are seeking a platform that allows us to quickly iterate on design and user testing during our engagement. While we intend to use resources within NOAA/NWS in the long-term for weather.gov 2.0, current options do not provide a ready-platform for deploying our application at the rate we need to be able to deploy with minimal intervention. Drupal 10 runs well on cloud.gov.

### Decision

We will use cloud.gov for sandbox and beta environments during our MVP phase. We are continuing to investigate/pursue a container deployment within NOAA/NWS systems, but will deploy our packaged software to cloud.gov in the interim in order to continue development and research work. Here is a diagram of the deployment: 

![image](https://github.com/weather-gov/weather.gov/assets/142825699/9e33be28-44c6-4b34-b300-e4616fa06c60)


### Consequences

Cloud.gov will allow us to iterate quickly during the MVP phase and learn more about our deployment but there are several consequences: 

- Maintaining cloud.gov will still require some infrastructure know-how to operate but it is a much lower level than taking on IaaS with another cloud setup
- Cloud.gov itself is FISMA Moderate, but there is no SCM/CI pipeline provided as part of it and the solutions out there for moderate/high are limited. We have already decided to use Github Actions (#243), which even in the enterprise version is Low.
- If we end up using a non-containerized deployment, using cloud.gov will be a distraction. We won’t be practicing deployments the way we will eventually have to deploy the app. 
- Even if we end up on a containerized deployment, we might not be able to deploy in the same way we do for development. 

