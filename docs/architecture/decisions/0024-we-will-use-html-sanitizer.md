# We will use html-santizer on unsafe strings
  
Date: 2025-09-18
  
### Status

Accepted
  
### Context

Django converts dangerous characters into HTML entities during template rendering. This is _extremely_ important for preventing XSS attacks.

Django also provides some mechansisms for turning off this default behavior.

When switching to Ruff as the code linter, it found some uses of Django's `mark_safe` function, which tells the template processor not to escape HTML on that string. This is useful if you'd like `an <em>important</em> message` to render as "an _important_ message" not as "an &lt;em&gt;important&lt;/em&gt; message".

We'd like to continue being able to use `mark_safe` without risk.

Several very popular libraries provide HTML sanitization. This means removing potentially dangerous HTML tags, while leaving others.

1. `bleach`, the most popular, is deprecated.
1. `nh3`, a popular replacement for bleach, appeared to have some bugs at the time of our evaluation. (For example, incorrectly handling a self-closing script tag next to a unix-style line break.)
1. `html-sanitizer`, a long-running project based on `lxml`, appears to be the best choice.

### Decision

We will never at any time render unsanitized strings which we didn't create, whether they came from the API, a CMS user, or even our own database.

We will provide our own function, `mark_safer`, which will run the string through the html-sanitizer library, before applying `mark_safe`.

### Consequences

- We will be less vulnerable to XSS attacks.
- However, there are XSS attacks that work even when a string has been sanitized. We acknowledge the risk is reduced, but not 100% eliminated, by sanitization.
- We may spend some additional time configuring `html-sanitizer` for our needs.