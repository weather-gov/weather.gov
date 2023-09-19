# We will use a content management system

Date: 2023-09-19

### Status

Accepted

### Context

We are building a new weather.gov which must support forecasters and others at Weather Forecasting Offices (WFOs) publishing information about weather events. Most of the content displayed on weather.gov will be delivered via automated systems (e.g., api.weather.gov), but some of the most crucial information on a weather.gov page is authored by human beings to explain weather hazards, timing, and preparedness.

### Decision

We will use a content management system (CMS).

### Consequences

We will not have to implement code for a variety of site requirements because they will be handled by the CMS for us:
- forms for forecasters to submit their weather narratives
- information architecture enforcement
- menus and navigation relationships
- page routing
- publishing workflows
- SEO optimization
- user authentication
  > All of the CMSes we considered after doing market research support SAML authentication, so we intend to integrate with ICAMS
- user authorization

Deployment into a production environment may be more complicated. Most of the CMSes we examined do not naturally fit into the 12-factor app methodology, so we may have to be creative with making that work.

Creating a consistent developer environment may be more difficult.

Deploying changes could be more complicated depending on the infrastructure architecture. For example, if we deploy into a full virtual server, how do we get our updated code into the virtual machine without disrupting anything else? How do we deploy configuration changes from dev into production?

We will need to determine who is responsible for deploying, updating, and maintaining the CMS itself (not the content it manages or the plugins we write).
