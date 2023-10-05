## Code Review Checklist

This is an automated comment on every pull request requiring a review. A checked item is either an assertion that I have tested this item or an indication that I have verified it does not apply to this pull request.

## The Basics
- [ ] Checks are passing
- [ ] I read the code
- [ ] I ran the code
- [ ] (if applicable) Post deploy steps are run
- [ ] (if applicable) I validated the change on the deployed version in <environment>

## Documentation
- [ ] changes to “how we do things” are documented in READMEs
- [ ] all new functions and methods are commented using plain language
- [ ] any new modules added documented in modules.md

## Security
- [ ] security false positives are documented
- [ ] data from external sources is cleaned and clearly marked

## Reliability
- [ ] error handling exists for unusual or missing values
- [ ] interactions with external systems are wrapped in try/except
- [ ] functionality is tested with unit or integration tests
- [ ] dependency updates in composer.json also got changed in composer-lock.json

## Infrastructure
- [ ] all changes are auditable and documented via a script
- [ ] it is clear who can and should run the script
- [ ] (if applicable) diagrams been updated or added in PlantUML

## Accessibility
- [ ] New pages have been added to cypress-axe file so that they will be tested with our automated accessibility testing
- Meets WCAG 2.0 AA or 2.1 AA for Section 508 compliance
    - [ ] Site is keyboard accessible. All interactions can be accessed with a keyboard
    - [ ] Site is free of keyboard traps. The keyboard focus is never trapped in a loop
    - [ ] All form inputs have explicit labels
    - [ ] Form instructions are associated with inputs
    - [ ] All relevant images use an img tag
    - [ ] All images have alt attributes
    - [ ] Multimedia is tagged. All multimedia has appropriate captioning and audio description
    - [ ] Text has sufficient color contrast. All text has a contrast ratio of 4.5:1 with the background
    - [ ] Site never loses focus. Focus is always visible when moving through the page with the keyboard
    - [ ] Tab order is logical
    - [ ] Tables are coded properly. Tables have proper headers and column attributes
    - [ ] Headings are nested properly. Heading elements are nested in a logical way
    - [ ] Language is set. The language for the page is set
    - [ ] CSS is not required to use the page. The page makes sense with or without CSS
    - [ ] Links are unique and contextual. All links can be understood taken alone, e.g., ‘Read more - about 508’
    - [ ] Page titles are descriptive

## Device Matrix
- [ ] firefox (renders correctly and user interactions work)
- [ ] chrome/chromium/edge (renders correctly and user interactions work)
- web page is readable and usable 
    - [ ] at 480px
    - [ ] at 1024px
