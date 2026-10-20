---
description: 'Spatial data conventions: Django ORM with PostGIS'
applyTo: 'forecast/spatial/**'
---
# Spatial Data Conventions

- All geospatial tables are defined as Django models in `forecast/spatial/models.py` with PostGIS. Do not create or alter spatial tables with raw SQL. See ADR `docs/architecture/decisions/0022-we-will-manage-spatial-tables-with-django-orm.md`.
- Use Django migrations for schema changes (`just make-migrations` then `just migrate`). `migrations.RunSQL` is acceptable only for data fixes or extensions, not for schema.
- Data loaders live in `forecast/spatial/management/commands/v1/data.py` and run through the `loadspatial` management command.
- Load spatial data with `just load-spatial` (`just load-spatial clean` forces a reload). Use `just load-states`, `load-counties`, `load-cwas`, `load-zones`, or `load-places` to load a single dataset.
- See `docs/dev/spatial-data.md` for loading data locally and in cloud environments. Ignore its "Updating geospatial tables" section, which describes the retired `spatial-data/sources` scripts.
