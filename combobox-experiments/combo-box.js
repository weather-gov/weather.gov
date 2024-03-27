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
    </style>
    <div id="input-area">
        <slot name="input"></slot>
    </div>
    <select>
        <slot name="option"></slot>
    </select>
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
        this.updateSearch = this.updateSearch.bind(this);
        this.showList = this.showList.bind(this);
        this.hideList = this.hideList.bind(this);
        this.navigateDown = this.navigateDown.bind(this);
        this.navigateUp = this.navigateUp.bind(this);
        this.focusListItem = this.focusListItem.bind(this);
        this.selectListItem = this.selectListItem.bind(this);
        this.selectWithKeyboard = this.selectWithKeyboard.bind(this);
        this.selectWithMouse = this.selectWithMouse.bind(this);
        this.submit = this.submit.bind(this);
        this.cacheLocationGeodata = this.cacheLocationGeodata.bind(this);
        this.getGeodataForKey = this.getGeodataForKey.bind(this);
        this.updateAriaLive = this.updateAriaLive.bind(this);
    }

    connectedCallback(){
        this.addEventListener("input", this.handleInput);
        this.addEventListener("keydown", this.handleKeyDown);
        this.shadowRoot.querySelector("select").addEventListener("change", this.handleSelectChanged);

        // Initial attributes
        this.setAttribute("aria-expanded", "false");
        this.classList.add("usa-combo-box");

        // Initial live dom elements, if not already present
        if(!this.querySelector('[slot="input"]')){
            let input = document.createElement("input");
            input.setAttribute("type", "text");
            input.setAttribute("slot", "input");
            input.setAttribute("role", "combobox");
            input.classList.add(...[
                "usa-combo-box__input"
            ]);
            this.append(input);
        }
        if(!this.querySelector('[slot="listbox"]')){
            let list = document.createElement("ul");
            list.setAttribute("role", "listbox");
            list.setAttribute("slot", "listbox");
            list.classList.add(...[
                "usa-combo-box__list",
            ]);
            this.append(list);
        }
    }

    disconnectedCallback(){
        this.removeEventListener("input", this.handleInput);
        this.shadowRoot.querySelector("select").removeEventListener("change", this.handleSelectChanged);
    }

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
                    "usa-combo-box__list-option"
                ]);

                li.addEventListener("focus", (e) => {
                    this.cacheLocationGeodata(e.target.dataset.value);
                });
                li.addEventListener("click", this.selectWithMouse);
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

    hideList(){
        this.setAttribute("aria-expanded", "false");
        this.querySelector("input").focus();
    }

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

    selectListItem(anElement){
        const listItems = Array.from(this.querySelectorAll("ul li"));
        listItems.forEach(listEl => {
            if(anElement === listEl){
                listEl.classList.add("usa-combo-box__list-option--selected");
                listEl.setAttribute("aria-selected", "true");
            } else {
                listEl.classList.remove("usa-combo-box__list-option--selected");
                listEl.setAttribute("aria-selected", "false");
            }
        });

        return listItems.indexOf(anElement);
    }

    focusListItem(anElement){
        Array.from(this.querySelectorAll("ul li")).forEach(listEl => {
            if(anElement === listEl){
                listEl.classList.add("usa-combox-box__list-option--focused");
                listEl.setAttribute("tabindex", "0");
                listEl.focus();
            } else {
                listEl.classList.remove("usa-combox-box__list-option--focused");
                listEl.setAttribute("tabindex", "-1");
            }
        });
    }

    handleEnterKey(event){
        if(event.target.matches('li[role="option"]')){
            this.selectWithKeyboard(event);
        } else if(event.target.matches('input[role="combobox"]')) {
            const selectEl = this.shadowRoot.querySelector("select");
            if(selectEl.value && selectEl.value !== ""){
                this.submit();
            }
        }
    }

    selectWithKeyboard(event){
        // If there is a currently focused list item,
        // we make that the current selection
        const selectEl = this.shadowRoot.querySelector("select");
        const inputEl = this.querySelector("input");
        const selectedItem = event.target;
        const option = this.shadowRoot.querySelector(`option[value="${selectedItem.dataset.value}"]`);
        if(option){
            selectEl.value = option.value;
            inputEl.value = option.textContent;
            this.hideList();
            this.updateAriaLive(
                `You have selected ${inputEl.value}. To see the weather for this location, press Enter. To search again, continue to edit text in this input area.`
            );
        }
    }

    selectWithMouse(event){
        const selectEl = this.shadowRoot.querySelector("select");
        const inputEl = this.querySelector("input");
        this.selectListItem(event.target);
        const option = this.shadowRoot.querySelector(`option[value="${event.target.dataset.value}"]`);
        if(option){
            selectEl.value = option.value;
            inputEl.value = option.textContent;
            this.hideList();
            this.updateAriaLive(
                `You have selected ${inputEl.value}. Do see the weather for this location, press Enter. To search again, continue to edit text in this input area.`
            );
        }
    }

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
                console.log(selectEl.value);
                formEl.submit();
            }
        }
    }

    async cacheLocationGeodata(magicKey){
        if(!window.sessionStorage.getItem(magicKey)){
            const result = await getLocationGeodata(magicKey);
            /* if(result){
             *     window.sessionStorage.setItem(
             *         magicKey,
             *         JSON.stringify(result)
             *     );
             * } */
            ArcCache.set(magicKey, result);
        }
    }

    async getGeodataForKey(magicKey){
        /* const cached = window.sessionStorage.getItem(magicKey);
         * if(cached){
         *     return JSON.parse(cached);
         * } else { */
        const cached = ArcCache.get(magicKey);
        if(!cached){
            return await getLocationGeodata(magicKey);
        }

        return cached;
    }

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

    static get observedAttributes(){
        return [
            "input-delay"
        ];
    }
};

window.customElements.define("wx-combo-box", ComboBox);

