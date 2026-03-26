# Weathergov 2.0

> [!IMPORTANT]
> This repository is primarily for transparency and awareness purposes. Members of the public may submit issues and leave comments. They may also submit pull requests, but there's no guarantee they will be merged.


## Running

After you have cloned the repository, you can run `just zap` to set up the containers. Visit [http://localhost:8080]() to see the application live once the containers are running. Visit [http://localhost:8081]() to see the API proxy's status once the containers are running.

## Documentation

There are many helpful guides under [docs/](./docs/) for [product owners](./docs/product/), [developers](./docs/dev/), designers, [researchers](./docs/research.md), and others, as well as [architechtural decision records](./docs/architecture/decisions/) to help explain how things got the way they are.

## AI Policy

In keeping with the [NOAA AI Strategic Plan](https://sciencecouncil.noaa.gov/wp-content/uploads/2022/08/Artificial-Intelligence-Strategic-Plan_Final-Signed.pdf), [Executive Order 14179 "Removing Barriers to American Leadership in Artificial Intelligence"](https://www.whitehouse.gov/presidential-actions/2025/01/removing-barriers-to-american-leadership-in-artificial-intelligence/), and [America's AI Action Plan](https://www.whitehouse.gov/wp-content/uploads/2025/07/Americas-AI-Action-Plan.pdf), we accept AI-assisted code that follows our normal code and review standards, but we impose a higher standard of quality for AI-assisted code. As with any code contribution, the human contributor must understand the problem it solves as well as the proposed solution.

Like with human-coded merge requests, the contributor must have run the code, as well as any tests, and be able to explain the code to the rest of the team. A human is always responsible for any submitted code -- including behavior, bugs, and side-effects -- even if the code is AI-generated. All merge requests must disclose if they include AI-assisted code, including the model name(s) and versions, relevant environments used (IDE, Copilot) and other information that can assist in understanding the code provenance.

Follow this checklist to be sure your merge request follows our policy:

- You've tagged, labelled, or otherwise marked all AI-generated code changes
- You have run the code yourself and can explain what it does
- You can explain to anyone -- expert or layperson -- what the changes are, what problems they solve, and what improvements they make

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

This git repository is the second iteration of Weathergov 2.0. The previous repository housed our codebase in Drupal; this repo was created for the migration to Wagtail/Django.
