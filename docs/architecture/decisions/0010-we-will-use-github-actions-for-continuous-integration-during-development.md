# We will use Github Actions for continuous integration during development

Date: 2023-10-10

### Status

Accepted

### Context

We need a platform to run our tests on and deploy changes to cloud.gov while developing the Drupal application. This will allow us to continually test the application for security issues, accessibility, and catch bugs. It will also allow us to set up automation as part of the code review process. 

There are several options for continuous integration that are available without procuring additional licenses, but Github Actions is built right into our source control management system.  There is also a Github Action for deploying to cloud.gov maintained by the cloud.gov team. 

### Decision

We will use Github Actions to perform tests, run audits, perform cron tasks, and deploy the Drupal application to cloud.gov. 

### Consequences

Github Actions is not Fedramped at the appropriate level for a Moderate system. It is unlikely we will be able to use it for continuous deployments without mitigation. It is also not certain we will be able to use it if we walk away from Cloud.gov. However, we would still be able to use Github Actions for running our tests and performing other automations that do not touch a production environment. 
