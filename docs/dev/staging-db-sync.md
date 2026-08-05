## Staging DB sync

When developing the CMS locally, we want to have our local environment mirror staging as closely as possible. As such, we can sync our local CMS databases with Staging (same user permissions, user groups, test users, content, page trees, etc.).

### Requirements

Make sure you have the cloudfoundry-cli (https://formulae.brew.sh/formula/cloudfoundry-cli#default) and cf-service-connect (https://github.com/cloud-gov/cf-service-connect) packages installed.

*NOTE*: The cloudfoundry-cli package from Homebrew is wonky, it is a known issue. You'll want to install using the instructions at the cloudfoundry site (https://docs.cloudfoundry.org/cf-cli/install-go-cli.html) vs. just the usual `brew install....` command. Just say "yes you trust the tap" when the prompt comes up.

### Download relevant tables from staging

In one terminal window, log in to cf cli:
`cf login -a api.fr.cloud.gov --sso`

Follow instructions to get your token.

Once logged in you'll need to select `nws-weathergov` for your org, and the env to sync from (generally, you'll want staging).

Once you're connected, run:
`cf connect-to-service -no-client weathergov-<env> weathergov-rds-<env>`

This outputs your connection parameters:

```
Host: localhost
Port: cf_port
Username: cf_username
Password: your_secure_password
Name: cf_db_name
```

You'll use these to connect to the <env> database.

Leave this terminal window open (this is your ssh tunnel) and in a new terminal window, run to following commands, dropping in the output of your cf connect-to-service command where indicated:

** Exports all tables _except_ spatial* and weathergov* (i.e. the geo files, etc., that are not necessary to update - doing the entire DB makes docker desktop explode because there's just too much data)

```bash
PGPASSWORD='<your_secure_password>' pg_dump -h localhost -p <cf_port> -U <cf_username> -d <cf_db_name> -T 'weathergov*' -T 'spatial*'  --clean --if-exists --no-owner --no-acl -f staging-dump.sql
```

### Import to locally running DB

Then run the following commands, one at a time, substituting the default (local) username and database name:

** Copy the file to the docker container
```bash
docker cp ~/staging-dump.sql weathergov-django-database-1:/tmp/staging-dump.sql
```

** Drop all tables (except weathergov* and spatial* tables) to avoid FK constraints since the user groups ids and page ids etc. etc. don't always match what's in staging
```bash
docker exec -i weathergov-django-database-1 psql -U POSTGRES_USER -d POSTGRES_DB -c "
DO \$\$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename NOT LIKE 'spatial_%'
        AND tablename NOT LIKE 'weathergov_%'
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END\$\$;
"
```

** Insert the staging data into your local DB
```bash
docker exec -i weathergov-django-database-1 psql -U POSTGRES_USER -d POSTGRES_DB -f /tmp/staging-dump.sql
```

** Set the wagtail pages to use localhost (it defaults to staging)
```bash
docker compose exec web python manage.py shell -c "
from wagtail.models import Site
site = Site.objects.get(is_default_site=True)
site.hostname = 'localhost'
site.port = 8080
site.save()
"
```

To test that the data is present from staging, visit http://localhost:8080/roadmap/.

You can log in using one of the test users from staging at http://localhost:8080/cms/. 

If pages aren't populating correctly (or allowing you to add them) you might need to fix the tree by running
```bash
docker compose exec web python manage.py fixtree
```

### Note

Logout is currently (as of this writing in August, 2026) not working so to enable logging out of one user and logging is as another during local development comment out the `/cms/logout/ -> /saml/logout/` redirect in the `urls.py` file. 
