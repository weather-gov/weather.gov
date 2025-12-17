# Combobox Components #
This directory contains several web components / custom elements that can be mixed together to create different kinds of combobox components.
  
## WCAG Definitions ##
Each of these components attempts to hew to the Web Content Accessiblity Guideline (WCAG) definition for each of the components, and attempts to implement the minimal set of capabilities according to those definitions.
  
Specific patterns used:
- [Combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)
- [Listbox](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/)
  
### Terminology ###
Because we are following the guidelines, there are some points of terminology that will be helpful to flesh out here.
  
The term `popup` refers to the part of a combobox component that "pops up" when the input changes, or, if used as a simple select component, the options are open for inspection. A `popup` can be any of: a listbox, grid, tree, or dialog. As of this writing, we only use listboxes, but affordances have been made so the combobox can use whatever popup it might need later on.
  
The term "pseudo focus" is one that we use ourselves to describe focus given to screenreaders and accessibility tools through the use of semantic elements, their roles, and any appropriate combination of aria attributes. It is different from the normal browser focus, and has different behavior. "Pseudo focus" is both visually indicated to sighted users via custom styling, but also distinguished to accessibility tools in large part by the ise of [`aria-activedescendant`](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/#kbd_focus_activedescendant). More information about browser focus and screenreader focus is available in [this guidance](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/#kbd_focus_activedescendant).
  
## Our components ##
### `Listbox` (as `<wx-listbox>`) ###
This is our baseline listbox component, which allows the user to navigate and select an item from a list of options. It can be used to form the consituent `popup` of a combobox, but can also be used as a part of other patterns, or on its own. You can read more about the guidance for listbox [here](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/).
  
Our baseline listbox component is designed to achieve the minimal spec compliant behavior for this pattern.
  
Listboxes can contain arbitrary element structures, so long as some descendant elements somewhere have `[role="option"]`. Our implementation is designed to only provide pseudo focus or select capabilities to elements with that attribute set.
  
#### Key actions ####
| key | what it does |
|-----|-------------------|
| `ArrowDown` | Moves the pseudo focus one `option` down in the list |
| `ArrowUp` | Moves the pseudo focus one `option` up in the list |
| `home` | Moves the pseudo focus to the first item in the list |
| `end` | Moves the pseudo focus to the last item in the list |
| `Enter` (or click) | Selects the item that has pseudo focus |
  
#### Events ####
| event name | description |
|-----------------|----------------|
| `wx:popup-nav` | Dispatched whenever a navigation event has occurred on the listbox, meaning pseudo focus has moved from one option to another one |
| `change` | Dispatched whenever there has been a change to the selection in the listbox |
  
### `FilterableListbox` (as `<wx-filterable-listbox>`) ###
This is a specialized type of listbox that can filter what options are currently being displayed and made available to the user. Filtering happens through a `filterText()` method, which takes a string that is used to fuzzy match the available options. How the options are hidden and restored is discussed below.
  
The key actions and events for this component are identical to Listbox, from which it inherits.
  
#### Implementation notes ####
Instead of using styling to visually hide certain options based on the filter, they are actually removed from the DOM of the listbox. In order to facilitate this, a caching system is present that will contain a clone of the full original options, and which is what gets filtered against every time the text changes. Restoring the original full list of options is then just a matter of cloning the cached copy and inserting. The actual implementation is a little more involved, but explained through the code comments and tests.
  
### `LocationListbox` (as `<wx-location-listbox>`)###
The location listbox is a variant of `FilterableListbox` where the `filterText()` method instead performs a live request to ArcGIS endpoints for the purposes of performing a location search. It has much of the same functionality that was originally in the location search combobox.
  
The key actions and events for this component are identical to Listbox, from which it indirectly inherits.
  
#### Implementation notes ####
The `LocationListbox` is primarily concered with the following activities:
- Fetching search results and displaying them dynamically as `option` elements in the listbox, whenever `filterText()` is called with a new search term
- Saving recent searches to the browsers storage
- Displaying any recent searches available in browser storage as permanent (non-filterable) `option` elements in the list, should they be present
- Caching location result to geographic information lookups, in browser storage
- Pre-emptively caching location result to geographic information lookups whenever a user navigates over a result item
  
All of the above were behaviors already being handled by the old version of the combobox.
  
### `Combobox` (as `<wx-combobox>`) ###
This is our minimal WCAG compliant implementation of a `combobox` component / pattern. 
  
It takes several named slotted elements that are used to complete its interaction:
| slot | description |
|------|----------------|
| `slot="toggle-button"` | A button element that will toggle the list open/closed when clicked or activated |
| `slot="clear-button"` | A button element that will clear the value of the combobox input and resent focus/selection |
| `slot="input"` | The input element that serves the `role="combobox"`, and is the primary element of interaction for the entire component |
| `slot="popup"` | The element that serves as the options popup for the combobox. It should be an element that has one of the following `role` attrbute values: listbox, grid, dialog, or tree. In our current use case we only use listbox. |
  
#### Handling `popup` selection ####
Whenever an item is selected within the `popup` component, the combobox will listen for the `change` event on it. When triggered, the combobox will attempt to find the nearest ancestor `<form>` element and call submit on it. The `input` element serving as the combobox will contain a value that gets passed to the action for the form.
  
## Notes on usage
In previous implementations of comboboxes, we had the custom elements initialize their required DOM children if they were not already present. We no longer do this. Instead, **it is assumed that consumers of the combobox and other components will provide the correct slotted elements themselves**. See the `.html` files in this directory for explicit examples.
  
## Running the examples
To run the examples, simply run `python http.server` in this directory, and point your browser to http://localhost:8000/index.html
