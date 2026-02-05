# Weathergov 2.0
## Running

After you have cloned the repository, you can run `just zap` to set up the containers. Visit [http://localhost:8080]() to see the application live once the containers are running. Visit [http://localhost:8081]() to see the API proxy's status once the containers are running.


## Documentation

The project documentation is built with MkDocs. You can read the guides in the `docs/` directory or serve them locally for a better reading experience.

To run the documentation server:
```bash
npm run docs:serve
# OR
just serve-docs
```

Visit [http://127.0.0.1:8000](http://127.0.0.1:8000) to view the docs.

The `serve-docs` command automatically runs a documentation update script (`scripts/update-docs.js`) before starting the server. This script ensures that the "Code organization" section in the README and the "Performance Results" in the Interop documentation are always up-to-date with the codebase.

The documentation covers:
- **[Getting Started](./docs/dev/index.md)**: Setup, Docker, and Just commands.
- **[API Interop Layer](./docs/interop/index.md)**: Technical details and schemas.
- **[Development](./docs/dev/index.md)**: Standards, testing, and debugging.
- **[Architecture](./docs/architecture/decisions/)**: Decision records.

## Code organization

> [!NOTE]  
> This section is automatically updated by running `npm run update-docs` or `just update-docs`.

We have organized the code into a few directories:

```
.
├── api-interop-layer
│   └── A node app which sits between the site and the API
├── api-proxy
│   └── A dev/debug tool for proxying API calls and inserting static data
├── docs
│   └── Documentation
│   
│   ├── architecture
│   │   ├── decisions
│   │   │   └── Records of why we made the decisions we did
│   │   └── diagrams
│   │       └── Some pretty pictures
│   ├── code-review-templates
│   │   └── Templates to make sure things aren't forgotten during code review
│   ├── dev
│   │   └── The ins-and-outs of engineering the site
│   │   
│   │   └── interop
│   │       └── Schemas and definitions
│   ├── environments.md
│   ├── how-we-work.md
│   ├── product
│   │   ├── roadmap.md
│   │   └── tagged-releases.md
│   │       └── <-- READ THIS IF YOU NEED TO DEPLOY IN A HURRY
│   ├── user-types.md
│   └── interop
│       └── API Interop Layer documentation
├── forecast
│   └── The main Django application
│   
│   ├── backend
│   │   └── This is the Wagtail CMS which serves the forecast pages!
│   ├── frontend
│   │   └── This is the JavaScript and other client-side assets
│   ├── locale
│   │   └── These are message files which can be used for creating translations
│   └── spatial
│       └── This is a Django sub-application that manages our spatial databases.
├── justfile
│   └── <-- This file runs developer commands (like a newer makefile)
├── scripts
│   └── Various shell scripts to do helpful things
├── spatial-data
│   └── A Node.js utility app for generating WFO maps
└── terraform
    └── This is the code for managing our infrastructure and deploying the site
```

## Historical Note

This git repository is the second of iteration Weathergov 2.0 in git. The previous repository housed our codebase in Drupal; this repo was created for the migration to Wagtail/Django.
