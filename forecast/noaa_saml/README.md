# NOAA SAML Integration #
A Django app that integrates our Django/Wagtail setup to use NOAA ICAM's [SAML](https://en.wikipedia.org/wiki/Security_Assertion_Markup_Language)-based Single Sign On system.
  
## Dependencies ##
This app relies heavily on the [SAML Python3 Toolkit library](https://github.com/SAML-Toolkits/python3-saml/tree/master), and borrows settings and other values from some of its examples.
  
## Endpoints ##
We introduce several new endpoints needed for the SAML flow:
  
| endpoint | purpose | request type | sent by |
| --------|--------|-------------|--------|
| `/saml/login/` | Redirects to ICAM and begins the SAML login flow | `GET` | user |
| `/saml/logout/` | Redirects to ICAM and begins a SAML logout flow | `GET` | user |
| `/saml/metadata/` | Responds with an XML representation of our SP metadata | `GET` | anyone |
| `/saml/acs` | Handles a login response from the IDP and either authenticates the user or displays errors | `POST` | IDP |
| `/saml/sls` | Handles a logout response from the IDP and either logs out the user on displays errors | `GET` | IDP |
  
  **NOTE**: The `/saml/acs` and `/saml/sls` endpoints _must_ be called without the trailing slash. This is because the metadata the IDP has registered for us is strict and has them without the slashes. Redirects to the slashed versions would break the saml flow.
    
## Authentication backend ##
Because our application does not use passwords when using SAML, we have added our own [custom authentication backend](https://docs.djangoproject.com/en/5.2/topics/auth/customizing/) to the Django application.
  
This backend uses the SAML Toolkit library to ensure that all responses from the IDP are valid and authenticated on their end, before authenticating and logging in users on our end.
  
## Settings ##
Settings for everything to do with SAML are defined by the settings constant `SAML_SETTINGS`. For a detailed look at what settings are possible, see the [Python3 SAML Toolkit readme](https://github.com/SAML-Toolkits/python3-saml/tree/master).
  
Additionally, we provide one additional top-level setting called `SAML_CREATES_NEW_USERS`, which determines whether or not first-time logins should create the corresponding user accounts in our system. If not, authentications for those cases -- even if they are authenticated by the IDP -- will fail.
  
### SAML Configurations ###
For the moment, we maintain two separate SAML configurations, which are used to set the overall `SAML_SETTINGS` variable.
  
These are located in `noaa_saml/config.py`, and consist of a production settings (with values pulled from VCAP) and a local development settings, which can be used by testing.
  
## Logging in ##
In order to log in, you will need to have a valid account registered with NOAA ICAM.
  
There is no "login page" when this application is configured to use SAML. Instead, you must bookmark or manually navigate to `http(s)://<host-name>/saml/login/` to begin the authentication flow. If successful, you should be redirected to the CMS administration page.
