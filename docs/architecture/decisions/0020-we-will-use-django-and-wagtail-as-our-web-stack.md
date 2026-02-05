# We will use Django and Wagtail as our web application stack
  
Date: 2025-02-03
  
### Status
Accepted
Supersedes [ADR 0003](0003-we-will-use-a-content-management-system.md)
  
### Context
Up until this point, we have been using [Drupal as our web application _and_ CMS framework](0003-we-will-use-a-content-management-system.md). As development progressed, we realized that the multi-paradigm nature of Drupal slowed down our development cycles, and that its architecture increasingly proved inappropriate to the actual needs of the product. PHP also proved clunky and slow for us in our development and testing environments.
  
Additionally, we have constantly reassessed what we need from a CMS (or if we need one at all), and as of this writing have determined that our needs are minimal at present, but that we need some flexibility going forward.
  
And last but not least: as our web application needs began to concentrate more on forecast pages made up of dynamic/sourced data -- which have little to do with CMS content -- we increasingly had to fight against the Drupal paradigm in order to get the results we needed.
  
### Decision
We will use [Django](https://www.djangoproject.com/) as our primary web application framework. We will also use [Wagtail](https://wagtail.org/) as our content management system (CMS), as it is merely an "app" that gets added to a Django project.
  
### Consequences
- We can rely upon the Model-View-Controller pattern for development, which should result in less friction for engineers and faster development cycles
- Will need to reimplement some application integrations and features that we already had setup in the Drupal environment, specifically the use of SAML for logging into the CMS and a framework for loading in translation files into the templates
- As with Drupal, much of the site requirements from the CMS side will be handled for us by Wagtail and we will not have to engineer them ourselves
- Configuration and migrations will be simpler to handle than in Drupal
- We will need to translate our existing site templates into Django form
- We will need to re-implement any code needed for providing structured data to the forecast page templates
- Page load times will likely be faster
