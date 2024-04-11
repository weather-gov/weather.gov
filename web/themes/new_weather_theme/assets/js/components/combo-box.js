const searchLocation = async (text) => {
    const url = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest?f=json&countryCode=USA%2CPRI%2CVIR%2CGUM%2CASM&category=Land+Features%2CBay%2CChannel%2CCove%2CDam%2CDelta%2CGulf%2CLagoon%2CLake%2COcean%2CReef%2CReservoir%2CSea%2CSound%2CStrait%2CWaterfall%2CWharf%2CAmusement+Park%2CHistorical+Monument%2CLandmark%2CTourist+Attraction%2CZoo%2CCollege%2CBeach%2CCampground%2CGolf+Course%2CHarbor%2CNature+Reserve%2COther+Parks+and+Outdoors%2CPark%2CRacetrack%2CScenic+Overlook%2CSki+Resort%2CSports+Center%2CSports+Field%2CWildlife+Reserve%2CAirport%2CFerry%2CMarina%2CPier%2CPort%2CResort%2CPostal%2CPopulated+Place&maxSuggestions=10&_=1695666335097&text=${text}`;
    return fetch(url, {headers: {'Content-Type': "application/json"}});
};

const getLocationGeodata = async (magicKey) => {
    const url = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/find?magicKey=${magicKey}&f=json&_=1695666335115`;
    const response = await fetch(url, { headers: {'Content-Type': "application/json"}});
    const results = await response.json();

    if (
        !results.error &&
        Array.isArray(results.locations) &&
        results.locations.length > 0
    ) {
        const {
            locations: [
                {
                    feature: { geometry },
                },
            ],
        } = results;

        const lat = Math.round(geometry.y * 1_000) / 1_000;
        const lon = Math.round(geometry.x * 1_000) / 1_000;
        return {lat, lon};
    } else {
        return null;
    }
};

/**
 * This object uses the browser's SessionStorage
 * to cache and retrieve ArcGIS magicKey data.
 * Each time a user navigates to a list option,
 * we fetch the result for that option asynchronously
 * and store in this cache.
 * Later, if the user selects an option, we first check
 * for the cached data before sending a request.
 * This can provide the perception of faster interaction.
 */
const ArcCache = {
    get: function(magicKey){
        const found = window.sessionStorage.getItem(magicKey);
        if(found){
            return JSON.parse(found);
        }
        return null;
    },
    set: function(magicKey, obj){
        const serialized = JSON.stringify(obj);
        window.sessionStorage.setItem(magicKey, serialized);
    }
};


const comboTemplate = `
    <style>
     :host {
         position: relative;
         display: inline-block;
         box-sizing: border-box;
     }
     :host([aria-expanded="true"]) #listbox-wrapper {
         display: block;
         position: absolute;
         top: 100%;
         left: 0;
         min-width: 100%;
         height: 300px;
         overflow-y: auto;
         box-sizing: border-box;
     }
     #listbox-wrapper,
     :host select {
         display: none;
     }

     #sr-only {
         display: block;
         position: absolute;
         left: -1000%;
         height: 1px;
         width: 1px;
     }

     #input-area {
         display: flex;
         flex-direction: row;
     }

     ::slotted(input){
         flex: 1;
     }

     .hidden {
         display: none;
     }
    </style>
    <div id="input-area">
        <slot name="input"></slot>
        <select>
            <slot name="option"></slot>
        </select>
        <span id="clear-button-wrapper" class="hidden">
            <slot name="clear-button"></slot>
        </span>
        <span id="toggle-button-wrapper">
            <slot name="toggle-button"></slot>
        </span>
    </div>
    <div id="listbox-wrapper">
        <slot name="listbox"></slot>
    </div>
    <div id="sr-only" aria-live="polite">
        <slot name="sr-only"></slot>
    </div>
`;

class ComboBox extends HTMLElement {
    constructor(){
        super();

        this.template = document.createElement("template");
        this.template.innerHTML = comboTemplate;
        this.attachShadow({mode: "open"});
        this.shadowRoot.append(
            this.template.content.cloneNode(true)
        );

        // Private property defaults
        this.inputDelay = 250;

        // Bound component methods
        this.handleInput = this.handleInput.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleEnterKey = this.handleEnterKey.bind(this);
        this.handleSelectChanged = this.handleSelectChanged.bind(this);
        this.updateSearch = this.updateSearch.bind(this);
        this.showList = this.showList.bind(this);
        this.hideList = this.hideList.bind(this);
        this.navigateDown = this.navigateDown.bind(this);
        this.navigateUp = this.navigateUp.bind(this);
        this.focusListItem = this.focusListItem.bind(this);
        this.selectListItem = this.selectListItem.bind(this);
        this.selectOption = this.selectOption.bind(this);
        this.submit = this.submit.bind(this);
        this.clear = this.clear.bind(this);
        this.cacheLocationGeodata = this.cacheLocationGeodata.bind(this);
        this.getGeodataForKey = this.getGeodataForKey.bind(this);
        this.updateAriaLive = this.updateAriaLive.bind(this);
        this._setSelectToOption = this._setSelectToOption.bind(this);
    }

    connectedCallback(){
        this.addEventListener("input", this.handleInput);
        this.addEventListener("keydown", this.handleKeyDown);
        this.shadowRoot.querySelector("select").addEventListener("change", this.handleSelectChanged);

        // Initial attributes
        this.setAttribute("aria-expanded", "false");
        this.classList.add("wx-combo-box");

        // Initial live dom elements, if not already present
        if(!this.querySelector('[slot="input"]')){
            let input = document.createElement("input");
            input.setAttribute("type", "text");
            input.setAttribute("slot", "input");
            input.setAttribute("role", "combobox");
            input.classList.add(...[
                "wx-combo-box__input"
            ]);
            this.append(input);
        }
        if(!this.querySelector('[slot="listbox"]')){
            let list = document.createElement("ul");
            list.setAttribute("role", "listbox");
            list.setAttribute("slot", "listbox");
            list.classList.add(...[
                "wx-combo-box__list",
            ]);
            this.append(list);
        }
        if(!this.querySelector('[slot="toggle-button"]')){
            let toggleButton = document.createElement("button");
            toggleButton.setAttribute("type", "button");
            toggleButton.setAttribute("aria-label", "Toggle the dropdown list");
            toggleButton.innerHTML = "&nbsp;";
            toggleButton.classList.add(...[
                "wx-combo-box__toggle-list",
                "display-block"
            ]);
            toggleButton.setAttribute("slot", "toggle-button");
            toggleButton.addEventListener("click", event => {
                if(this.isShowingList){
                    this.hideList();
                } else {
                    this.showList();
                }
            });
            this.append(toggleButton);
        }
        if(!this.querySelector('[slot="clear-button"]')){
            let clearButton = document.createElement("button");
            clearButton.setAttribute("type", "button");
            clearButton.setAttribute("tabindex", "-1");
            clearButton.setAttribute("slot", "clear-button");
            clearButton.classList.add(...[
                "wx-combo-box__clear-input",
                "display-block"
            ]);
            clearButton.innerHTML = "&nbsp;";
            clearButton.addEventListener("click", e => {
                this.clear();
            });
            this.append(clearButton);
        }
    }

    disconnectedCallback(){
        this.removeEventListener("input", this.handleInput);
        this.shadowRoot.querySelector("select").removeEventListener("change", this.handleSelectChanged);
    }

    /**
     * Handle input events on the custom element.
     * These will be triggered by the slotted input
     * element, then bubble up.
     */
    handleInput(event){
        if(this._timeout){
            window.clearTimeout(this._timeout);
        }
        this._timeout = window.setTimeout(() => {
            this.updateSearch(event.target.value)
                .then(() => {
                    this.updateAriaLive(
                        `Search updated. ${this.querySelectorAll("li").length} results available`
                    );
                });
        }, this.inputDelay);
    }

    /**
     * Triggered by input changes.
     * Will make a request to the ArcGIS endpoint
     * for search results.
     * Clears out the current list items and select
     * options, then creates new versions of each set,
     * with the correct classes and event handlers
     * set up.
     */
    async updateSearch(text){
        const response = await searchLocation(text);
        if(response.ok){
            const data = await response.json();
            // Clear the existing options
            Array.from(this.querySelectorAll('ul[role="listbox"] > li')).forEach(optionEl => {
                optionEl.remove();
            });
            this.shadowRoot.querySelector("select").innerHTML = "";
            // Create new options
            const options = data.suggestions.map(suggestion => {
                const option = document.createElement("option");
                option.innerText = suggestion.text;
                option.setAttribute("value", suggestion.magicKey);
                option.setAttribute("slot", "option");
                return option;
            });
            const items = data.suggestions.map((suggestion, idx) => {
                const li = document.createElement("li");
                li.innerText = suggestion.text;
                li.setAttribute("role", "option");
                li.setAttribute("aria-setsize", data.suggestions.length);
                li.setAttribute("aria-posinset", idx + 1);
                li.setAttribute("aria-selected", "false");
                li.setAttribute("data-value", suggestion.magicKey);
                li.classList.add(...[
                    "wx-combo-box__list-option"
                ]);

                li.addEventListener("focus", (e) => {
                    this.cacheLocationGeodata(e.target.dataset.value);
                });
                li.addEventListener("click", this.selectOption);
                return li;
            });
            // Append to shadow select element
            this.shadowRoot.querySelector("select").append(...options);
            this.querySelector('[slot="listbox"]').append(...items);

            // If there are results, show the area
            if(data.suggestions.length){
                this.showList();
            } else {
                this.hideList();
            }
        }
    }

    /**
     * Event handler for keydown, mapped
     * to the keys that we care about
     */
    handleKeyDown(event){
        let handled = true;
        const inputEl = this.querySelector("input");
        if(event.key === "ArrowDown" || event.key === "Down"){
            this.navigateDown(event.target);
        } else if(event.key === "ArrowUp" || event.key === "Up"){
            this.navigateUp(event.target);
        } else if(event.key === "Escape"){
            this.hideList();
        } else if(event.key === "Enter"){
            this.handleEnterKey(event);
        } else {
            handled = false;
        }

        if(handled){
            event.preventDefault();
        }
    }

    /**
     * Handler for change events on the shadow dom's
     * select element. Note that due to how these
     * element's getters/setters work, we are forced to
     * trigger the change event manually.
     * See _setSelectToOption()
     */
    handleSelectChanged(event){
        const wrapper = this.shadowRoot.getElementById("clear-button-wrapper");
        if(event.target.selectedIndex >= 0){
            // In this case, something is currently selected,
            // so we should show the clear button
            wrapper.classList.remove("hidden");
        } else {
            wrapper.classList.add("hidden");
        }
    }

    /**
     * Shows the unordered list of results to the user.
     * Visually selects the first item if there are
     * items in the list
     */
    showList(){
        this.setAttribute("aria-expanded", "true");
        const listIsEmpty = this.querySelector("ul:empty");
        if(!listIsEmpty){
            // We want to give the artificial focus,
            // which means temporary selection both
            // in aria and in visual styling,
            // to the first element in the dropdown
            const firstListItem = this.querySelector("ul li:first-child");
            this.selectListItem(firstListItem);
        }
    }

    /**
     * Hides the results list from display.
     * Note that it returns focus to the
     * combobox input element
     */
    hideList(){
        this.setAttribute("aria-expanded", "false");
        this.querySelector("input").focus();
    }

    /**
     * Handles the case where the user has pressed
     * the arrow down key in a result list or input.
     * If the list is not currently open, this action opens it.
     * Otherwise, it nagivates down to the next item in the list,
     * giving it focus.
     * @var targetEl HTMLElement - The target element of the
     * originating keyboard event.
     */
    navigateDown(targetEl){
        // If we are not already showing the list,
        // then we should now show it and focus
        // on the first item in the list
        if(!this.isShowingList){
            this.showList();
            return;
        }
        
        let nextItem;
        if(targetEl.matches("input:focus")){
            nextItem = this.querySelector("li:first-child");
        } else {
            nextItem = this.querySelector('li:focus + li');
        }
        
        if(nextItem){
            this.focusListItem(nextItem);
        }
    }

    /**
     * Handles the case where the user has pressed
     * the arrow up key in a result list or input.
     * If the first item is currently selected, this action will
     * hide the list and return the focus to the input.
     * Otherwise, it selects and gives focus to the previous
     * item in the list.
     * @var targetEl HTMLElement - The target element of the
     * originating keyboard event. 
     */
    navigateUp(targetEl){
        const listItems = Array.from(this.querySelectorAll("li"));
        const currentFocus = this.querySelector('li:focus');
        const currentFocusIndex = listItems.indexOf(currentFocus);
        const nextItem = listItems[currentFocusIndex - 1];
        if(nextItem){
            this.focusListItem(nextItem);
        } else {
            this.querySelector("input").focus();
            this.hideList();
        }
    }

    /**
     * Visually selects a list item for display and
     * accessibility purposes.
     * Updates the classes and aria attributes.
     * @var anElement HTMLElement - A list item element
     */
    selectListItem(anElement){
        const listItems = Array.from(this.querySelectorAll("ul li"));
        listItems.forEach(listEl => {
            if(anElement === listEl){
                listEl.classList.add("wx-combo-box__list-option--selected");
                listEl.setAttribute("aria-selected", "true");
            } else {
                listEl.classList.remove("wx-combo-box__list-option--selected");
                listEl.setAttribute("aria-selected", "false");
            }
        });

        return listItems.indexOf(anElement);
    }

    /**
     * Gives focus to the passed list item element,
     * blurring all the others accordingly.
     * @var anElement HTMLElement - A list item element
     */
    focusListItem(anElement){
        Array.from(this.querySelectorAll("ul li")).forEach(listEl => {
            if(anElement === listEl){
                listEl.classList.add("wx-combox-box__list-option--focused");
                listEl.setAttribute("tabindex", "0");
                listEl.focus();
            } else {
                listEl.classList.remove("wx-combox-box__list-option--focused");
                listEl.setAttribute("tabindex", "-1");
            }
        });
    }

    /**
     * Event handler for when the Enter key is pressed inside
     * the combobox input element or one of the list items.
     * If there is a current selection in the actual input/select,
     * meaning the user has actually selected something from
     * the dropdown already, this will trigger submission.
     * If the target element is a list item, then this
     * method simply chooses/selects that list item
     */
    handleEnterKey(event){
        if(event.target.matches('li[role="option"]')){
            this.selectOption(event);
        } else if(event.target.matches('input[role="combobox"]')) {
            const selectEl = this.shadowRoot.querySelector("select");
            if(selectEl.selectedIndex > -1){
                this.submit();
            }
        }
    }

    /**
     * Selects the currently highlighted option/list-item
     * as the current selection.
     * Updates both the value of the combobox input and
     * the hidden select element to the corresponding option.
     * When complete, will hide the result list and also
     * update the aria-live region with text about what was
     * selected.
     */
    selectOption(event){
        // If there is a currently focused list item,
        // we make that the current selection
        const selectEl = this.shadowRoot.querySelector("select");
        const inputEl = this.querySelector("input");
        const selectedItem = event.target;
        const option = this.shadowRoot.querySelector(`option[value="${selectedItem.dataset.value}"]`);
        if(option){
            this._setSelectToOption(option);
            inputEl.value = option.textContent;
            this.hideList();
            this.updateAriaLive(
                `You have selected ${inputEl.value}. To see the weather for this location, press Enter. To search again, continue to edit text in this input area.`
            );
        }
    }

    /**
     * Clears the input and the shadow select
     * element values
     */
    clear(){
        const input = this.querySelector("input");
        input.value = null;
        this._setSelectToOption(null);
    }

    /**
     * Triggers a submit call on an ancestor form element,
     * if present.
     */
    async submit(){
        const formEl = this.closest("form[data-location-search]");
        const textInput = document.createElement("input");
        textInput.setAttribute("type", "hidden");
        textInput.setAttribute("name", "placeName");
        this.append(textInput);
        if(formEl){
            const selectEl = this.shadowRoot.querySelector("select")
            const optionText = this.shadowRoot.querySelector(`option[value="${selectEl.value}"]`).textContent;
            textInput.value = optionText;
            const coordinates = await this.getGeodataForKey(selectEl.value);
            if(coordinates){
                formEl.setAttribute("action", `/point/${coordinates.lat}/${coordinates.lon}`);
                formEl.submit();
            }
        }
    }

    /**
     * Asynchronously fetches specific location data
     * for a given search result, stashing it away in
     * the cache (See ArcCache)
     */
    async cacheLocationGeodata(magicKey){
        if(!window.sessionStorage.getItem(magicKey)){
            const result = await getLocationGeodata(magicKey);
            ArcCache.set(magicKey, result);
        }
    }

    /**
     * Attempts to retrieve location data for a search
     * result by its magicKey from the cache.
     * If not present, will make the Arc API call
     * to fetch the data.
     */
    async getGeodataForKey(magicKey){
        const cached = ArcCache.get(magicKey);
        if(!cached){
            return await getLocationGeodata(magicKey);
        }

        return cached;
    }

    /**
     * Adds a span of screenreader only text to
     * this component's shadow aria-live region,
     * which it itself also hidden.
     * Makes use of a slot called "sr-only".
     * The update is on a 1 second delay, which is preferred
     * based on convos with USWDS.
     */
    updateAriaLive(text){
        window.setTimeout(() => {
            const span = document.createElement("span");
            span.setAttribute("slot", "sr-only");
            span.innerText = text;
            this.append(span);
        }, 1000);
    }

    attributeChangedCallback(name, oldVal, newVal){
        if(name === "input-delay"){
            this.inputDelay = parseInt(newVal);
        }
    }

    get isShowingList(){
        return this.getAttribute("aria-expanded") === "true";
    }

    /**
     * Because the select element is just special in so many ways,
     * updating the selectedIndex or value programmatically will
     * _not_ trigger a change event from the element. So, we
     * have to do it ourselves manually.
     * This private method is a convenience wrapper for
     * setting a select to one of its constituent option elements,
     * then dispatching a change event.
     */
    _setSelectToOption(option=null){
        const selectEl = this.shadowRoot.querySelector("select");
        if(!option){
            selectEl.selectedIndex = -1;
        } else {
            selectEl.selectedIndex = Array.from(selectEl.children).indexOf(option);
        }

        const event = new Event("change", { bubbles: true });
        selectEl.dispatchEvent(event);
    }

    static get observedAttributes(){
        return [
            "input-delay"
        ];
    }
};

window.customElements.define("wx-combo-box", ComboBox);
