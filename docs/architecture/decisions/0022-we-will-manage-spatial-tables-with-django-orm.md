# We will manage our spatial database tables with the Django ORM

Date: 2025-09-18

### Status

Accepted

### Context

In [ADR 0014](0014-we-will-store-and-use-our-own-geospatial-data.md), we decided to manage geospatial data ourselves. That has worked out well for us. However, becasue we did not have any sort of database model management or migration management tools, we ended up writing a decent amount of custom code to create and version those tables and the data within them.

In [ADR0020](0020---.md), we decided to switch to Django, which includes a robust ORM. Django also includes support for spatial databases.

### Decision

- We will use the Django ORM to manage our geospatial tables

### Consequences

- We can use Django's migration tools to handle schema versioning.
- We will need to decide how to handle spatial data versioning.
- We will need to decide how to load spatial data into our cloud environment.
- We will have to rewrite our spatial data ingest tools in Python.
- We will be able to use Django models to perform spatial queries in our Django application, as needed.
