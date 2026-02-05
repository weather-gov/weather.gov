# Weathergov 2.0
## Running

After you have cloned the repository, you can run `just zap` to set up the containers. Visit [http://localhost:8080]() to see the application live once the containers are running. Visit [http://localhost:8081]() to see the API proxy's status once the containers are running.

## Documentation

There are many helpful guides under [docs/](./docs/) for [product owners](./docs/product/), [developers](./docs/dev/), designers, [researchers](./docs/research.md), and others, as well as [architechtural decision records](./docs/architecture/decisions/) to help explain how things got the way they are.

## Code organization

This overview will likely become outdated, but it may help to orient you to the project.

```
.
├── api-interop-layer
│   └── A node app which sits between the site and the API
│
├── api-proxy
│   └── A dev/debug tool for proxying API calls and inserting static data
│
├── docs
│   ├── architecture
│   │   ├── decisions
│   │   │   └── Records of why we made the decisions we did
│   │   └── diagrams
│   │       └── Some pretty pictures
│   ├── code-review-templates
│   │   └── Templates to make sure things aren't forgotten during code review
│   ├── dev
│   │   ├── interop
│   │   │   └── ????
│   │   └── The ins-and-outs of engineering the site
│   ├── environments.md
│   ├── how-we-work.md
│   ├── product
│   │   ├── roadmap.md
│   │   └── tagged-releases.md <-- READ THIS IF YOU NEED TO DEPLOY IN A HURRY
│   └── user-types.md
│
├── forecast
│   ├── backend
│   │   └── This is the Wagtail CMS which serves the forecast pages!
│   ├── frontend
│   │   └── This is the JavaScript and other client-side assets
│   ├── locale
│   │   └── These are message files which can be used for creating translations
│   └── spatial
│       └── This is a Django sub-application that manages our spatial databases.
│
├── justfile <-- This file runs developer commands (like a newer makefile)
│
├── scripts
│   └── Various shell scripts to do helpful things
├── spatial-data
│   └── A Node.js utility app for generating WFO maps
│
├── terraform
│   └── This is the code for managing our infrastructure and deploying the site
│
└─── tests
    ├── playwright
    │   └── End to end tests of the running site using Playwright
    └── translations
        └── Test scripts to ensure translation keys exist (deprecated)
```

## Historical Note

This git repository is the second of iteration Weathergov 2.0 in git. The previous repository housed our codebase in Drupal; this repo was created for the migration to Wagtail/Django.
