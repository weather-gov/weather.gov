# We will use utility-first approach to CSS

Date: 2023-10-05

### Status

Accepted

### Context

USWDS offers [utility classes](https://designsystem.digital.gov/utilities/) for use within our HTML instead of writing custom css code blocks. Utilities are simple HTML classes typically scoped to a single CSS property, like or . Utilities can be used additively to style an object from scratch or to override a style defined in component CSS.

Utilities allow designers and developers to build and test new designs and components without abstracting their work into traditional semantic names or altering production CSS.

They also make it possible to create element-specific overrides without writing high-specificity variants into component CSS.

### Decision

We will use utility classes in our HTML components. If higher specificity or customization is needed on a class, we will configure it in the theme settings file (). [All USWDS settings](https://designsystem.digital.gov/documentation/settings/).

For example, this means adding a class to our HTML element:

```
bg-secondary-darker
```

...or adding a line to our theme settings file:

```
$theme-banner-background-color: "secondary-darker",
```

...instead of writing overriding CSS blocks:

```
.usa-banner {
    font-family: Nunito,Open Sans,Helvetica Neue,sans-serif;
    font-size: .99rem;
    line-height: 1.6;
    background-color: #f0f0f0;
}
.usa-banner {
    background-color: #8b0a03;
}
```

### Consequences

**Positive**

- Allows us to keep our styles inline with our components.
- Eliminates repetitive, unused CSS aka [CSS bloat](https://css-tricks.com/un-bloat-css-by-using-multiple-classes/).
- Keeps changes to a minimum using one utility settings file.
- Easier onboarding, since there's one source of truth.
- Allows our designers to easily make changes without knowing CSS.
- Keeps up with modern, component-driven best practices.

**Negative**
I don't see one.

**Neutral**
You have to refer to the documentation for usage. Docs are available both online and in code.
