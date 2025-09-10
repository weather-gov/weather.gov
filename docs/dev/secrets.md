# Secrets
========================

Secrets are read from the running environment in cloud.gov.

Secrets were originally created with:

```sh
cf cups weathergov-credentials -p credentials-<ENVIRONMENT>.json
```

Where `credentials-<ENVIRONMENT>.json` looks like:

```json
{
    "CRON_KEY": "",
    ...
}
```

(Specific credentials are mentioned below.)

You can see the current environment with `cf env <APP>`, for example `cf env weathergov-staging`.

The commands `cups` and `uups` stand for [`create user provided service`](https://docs.cloudfoundry.org/devguide/services/user-provided.html) and `update user provided service`. User provided services are the way currently recommended by Cloud.gov for deploying secrets. The user provided service is bound to the application in `manifest-<ENVIRONMENT>.yml`.

To rotate secrets, create a new `credentials-<ENVIRONMENT>.json` file or update the existing, upload it, then restage the app. These files are never to be checked into git and are excluded in all our ignore files.

Example:

```bash
cf update-user-provided-service weathergov-credentials -p credentials-staging.json
cf restage weathergov-staging --strategy rolling
```

Non-secret environment variables can be declared in `manifest-<ENVIRONMENT>.yml` directly.

## CRON_KEY

Used for cron and set in settings. Updating in the environment and restaging should reset.

## HASH_SALT

This is used for one-time logins, form tokens, etc. and is set in settings. 

## IDP_PUBLIC_KEY

This is the base64 encoded public key used in the SAML authentication flow with our IDP. It comes from the IDP and is public. It is used to complete the SAML sandshake with our IDP during authetnication requests. If the IDP changes this key, it will need to be updated.

## SP_PRIVATE_KEY

This is the base64 encoded private key used in the SAML authentication flow with our IDP. It is used to complete the SAML sandshake with our IDP during authetnication requests. Generating a new public/private key pair entails following the process set out in the ICAM documentation.

## SP_PUBLIC_KEY

This is the base64 encoded public key used in the SAML authentication flow with our IDP in combination with our - the "service provider" - private key. It is used to complete the SAML sandshake with our IDP during authetnication requests. Generating a new public/private key pair entails following the process set out in the ICAM documentation.

## ROOT_USER_NAME and ROOT_USER_PASS

These are the login credentials for the root account that can be used for basic authentication for an admin user here: https://weathergov-<environment>.app.cloud.gov/user/login. If you need to rotate these, you will also need to reset the password with Drupal: 

`drush upwd --password="NewPassword" <root_user_name>`

## NEWRELIC_LICENSE

We need to set the New Relic license in two places. We need it in VCAP_SERVICES so that the Drupal New Relic APM module can pick it up. And we need to set it as an environment variable so the PHP Buildpack knows to install the APM as well. These steps are included in the cloudgov env create script. 
