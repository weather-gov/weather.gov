# We will use Drupal's core translation modules for static interface internationalization #
  
  Date: 2024-07-11
    
### Status
Accepted
  
### Context
There are three aspects to internationalization (i18n) and translations when it comes to our site:
1. **Providing translations for static text across the public site's interface**. 
      These "static" portions include site headers, button labels, aria descriptions, and other portions of the site that we have written ourselves in custom theme templates.
2. **Translations of authored content in the CMS**
      A separate issue will be translating content that is authored by NWS staff within the CMS, and then later displayed to the public.
3. **Translations of information and labels returned by the NWS API**
      This is an ongoing issue to be resolved later.
        
  
The purpose of this ADR is to address **point 1 above**.
  
As with most large web frameworks, internationalization of static text / templated assets involves setting up the available languages in the system, and then providing custom "translation files" of some format. In site templates, any text meant to be translated will be wrapped in some kind of translation function / filter.
  
Drupal's core already provides [modules for enabling this kind of translation and language integration](https://api.drupal.org/api/drupal/core%21lib%21Drupal%21Core%21Language%21language.api.php/group/i18n/10). With this ADR we are specifically addressing one kind of translation, what Drupal calls [Interface Translation](https://api.drupal.org/api/drupal/core%21modules%21locale%21locale.api.php/group/interface_translation_properties/10). This system relies upon a series of [gettext](https://www.gnu.org/software/gettext/manual/html_node/PO-Files.html) files (with the `.po` extension), that map the English phrase -- which is used as the lookup key in translation files for non-English languages -- to the translated variant of the text.
  
It is important to know that in this setup, English is the default and that lookup keys for translations are not some arbitrary label, but the English version of the phrase itself.
  
### Decision
We will use Drupal's core Internationalization modules for "interface translation" (ie static text we have customized in our templates), enabled via a custom module where we store our gettext translation files. We will use English-to-English as the first integrated example of this setup, to ensure that the system is working.
  
### Consequences
By using our own custom, separate module for storing and enabling our own translation files, we keep all the translation information in one place. Additionally, if we need to include any custom code and/or hooks for dealing with probable translation edge cases (think right-to-left languages or special character sets), we will already have a module where we can add that custom code.
  
The use of translation files allows us to store the translation in ur code repository and keep it versioned. It also allows us to programmatically track changes to any translations as we proceed. Additionally, we can later develop intergrated tests to make sure we are accounting for all text that should be translated, as well as pruning translations that are no longer used.
  
