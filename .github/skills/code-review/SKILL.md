---
name: code-review
description: 'Review code changes against project checklists and quality standards. Use when reviewing a merge request, a branch diff, or a set of changed files. Checks security, accessibility, reliability, translations, documentation, and component-specific conventions.'
argument-hint: 'Optionally provide a branch name, file list, or description of the changes to review'
---

# Code Review

Review code changes against the project's review checklists and quality standards.

## When to Use

- Reviewing a merge request or branch before merge
- Checking a set of changed files against project standards
- Preparing a self-review before submitting a merge request

## Procedure

### 1. Identify changed files

- If the user provides a branch name, diff the branch against `main` to get the list of changed files.
- If the user provides specific files, use those.
- If neither, ask what to review.

### 2. Classify the change

Determine which review checklist applies:

- If the change is documentation only (only `.md` files, no code), use the [documentation review checklist](./references/checklist-docs.md).
- Otherwise, use the [web/code review checklist](./references/checklist-web.md).

### 3. Load relevant component instructions

Based on the file types in the diff, read the matching instruction files from `.github/instructions/`. Only load instructions for components actually touched:

- `**/*.scss` files changed → read `.github/instructions/css-uswds.instructions.md`
- `forecast/frontend/**/*.js` files changed → read `.github/instructions/javascript-bundling.instructions.md`
- `api-interop-layer/**/*.js` files changed → read `.github/instructions/api-interop-layer.instructions.md`
- `forecast/backend/templates/**` or `forecast/locale/**` files changed → read `.github/instructions/django-translations.instructions.md`
- `forecast/spatial/**` files changed → read `.github/instructions/spatial-data.instructions.md`

### 4. Review the code

Read each changed file. Evaluate the changes against:

1. The applicable review checklist items (from step 2).
2. The [quality standards](./references/quality-standards.md).
3. Any component-specific instruction files loaded in step 3.

### 5. Produce the review

Organize findings into these categories, omitting any category with no findings:

```
## Security
## Reliability
## Accessibility
## Documentation
## Translations
## Component conventions
## Quality standards
## Suggestions
```

For each finding:
- State the file and line.
- State what the issue is in one sentence.
- State what change is needed.

End with a summary: how many issues found per category, and whether the change is ready to merge or needs revisions.

### 6. Remind about AI disclosure

If this review was AI-assisted, remind the reviewer that the project's AI policy requires merge requests to disclose AI tool usage (model names, versions, environments), that AI-generated code changes must be tagged or labelled, and that a human must have run and be able to explain all code before merging. See `README.md` for the full policy.
