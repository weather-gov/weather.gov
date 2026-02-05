# Authentication

## SAML

SAML with ICAM, the IDP for NOAA Accounts, is the main way users access the weather.gov CMS. Every deployed environment should have a SAML handshake with the IDP enabled. SAML is not setup to work with localhost (where you can use basic auth to access the CMS). The relevant certs are placed in the container at runtime in order to perform the handshake. All configuration is saved in the Drupal configuration files. If you make an update to the SAML configuration, you will have to export the changes for them to take effect everywhere.

### Generate metadata

Login as an administrator and access the metadata for your environment at weathergov-ENV.app.cloud.gov/saml/metadata. If this is a new environment, we will have to send the IDP team at ICAM this metadata before SAML will work with that environment. Create the sandbox environment prior to this step. In addition, you will have to add a line to [the cloud.gov settings](../../web/sites/default/settings.cloudgov.php) in the SAML-related switch statement prior to deploying the sandbox: 

```
$config['samlauth.authentication']['sp_entity_id'] = 'https://weathergov-ENV.app.cloud.gov';
```

## Basic auth

We no longer provide basic auth in all environments. We still do have a UID 1 in all environments created at sandbox create time that can be accessed via `drush user:login`. This will create a one-time link to access the interface for this user. The only environments still equipped with basic auth are dev and any environment not yet setup with ICAM SAML. 
