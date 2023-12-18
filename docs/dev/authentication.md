# Authentication

## SAML

SAML with ICAM, the IDP for NOAA Accounts, is the main way users access the weather.gov CMS. Every deployed environment should have a SAML handshake with the IDP enabled. SAML is not setup to work with localhost. The relevant certs are placed in the container at runtime in order to perform the handshake. All configuration is saved in the Drupal configuration files. If you make an update to the SAML configuration, you will have to export the changes for them to take effect everywhere.

### Generate metadata

Login as root/admin and access the metadata for your environment at weathergov-ENV.app.cloud.gov/saml/metadata. If this is a new environment, we will have to send the IDP team at ICAM this metadata before SAML will work with that environment. Create the sandbox environment prior to this step. In addition, you will have to add a line to [the cloud.gov settings](../../web/sites/default/settings.cloudgov.php) in the SAML-related switch statement prior to deploying the sandbox: 

```
$config['samlauth.authentication']['sp_entity_id'] = 'https://weathergov-ENV.app.cloud.gov';
```

## Basic auth

We also have a root username and password setup and the ability add additional non-saml accounts. Users login to these accounts at weathergov-ENV.app.cloud.gov/user/login. Basic auth is the only option for local development at this time.
