# We use SAML to allow forecasters and website administrators to login to the CMS using their NOAA account

Date: 2023-10-25

### Status

Accepted

### Context

We need to allow users to login to the CMS in order to create content. We connect to ICAMS which runs NOAA Accounts using SAML. 

### Decision

We connect to ICAMS which runs NOAA Accounts using SAML. SAML is the recommended way to connect with ICAMS by that team. We use the module [samlauth](https://www.drupal.org/project/samlauth) on the client side to perform the connection. 

### Consequences

Users will have to have a NOAA account in order to access the CMS and manage content. ICAMS provides instructions for external users to get different types of accounts. 
