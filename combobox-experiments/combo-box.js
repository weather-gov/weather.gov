const searchLocation = async (text) => {
    const url = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest?f=json&countryCode=USA%2CPRI%2CVIR%2CGUM%2CASM&category=Land+Features%2CBay%2CChannel%2CCove%2CDam%2CDelta%2CGulf%2CLagoon%2CLake%2COcean%2CReef%2CReservoir%2CSea%2CSound%2CStrait%2CWaterfall%2CWharf%2CAmusement+Park%2CHistorical+Monument%2CLandmark%2CTourist+Attraction%2CZoo%2CCollege%2CBeach%2CCampground%2CGolf+Course%2CHarbor%2CNature+Reserve%2COther+Parks+and+Outdoors%2CPark%2CRacetrack%2CScenic+Overlook%2CSki+Resort%2CSports+Center%2CSports+Field%2CWildlife+Reserve%2CAirport%2CFerry%2CMarina%2CPier%2CPort%2CResort%2CPostal%2CPopulated+Place&maxSuggestions=10&_=1695666335097&text=${text}`;
    return fetch(url, {headers: {'Content-Type': "application/json"}});
};


const comboTemplate = `
    <style>
     :host {
         position: relative;
     }
     :host([aria-expanded="true"]) #listbox-wrapper {
         display: block;
         position: absolute;
         top: 100%;
         left: 0;
         min-width: 100%;
height: 300px;
         overflow-y: auto;
     }
     #listbox-wrapper,
     :host select {
         display: none;
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
        this.updateSearch = this.updateSearch.bind(this);
        this.handleSelectChanged = this.handleSelectChanged.bind(this);
    }

    connectedCallback(){
        this.addEventListener("input", this.handleInput);
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
            this.updateSearch(event.target.value);
        }, this.inputDelay);
    }

    handleSelectChanged(event){
        // Nothing for now
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
              li.classList.add(...[
                "usa-combo-box__list-option"
              ]);
                return li;
            });
            // Append to shadow select element
            this.shadowRoot.querySelector("select").append(...options);
            this.querySelector('[slot="listbox"]').append(...items);

            // If there are results, show the area
            if(data.suggestions.length){
                this.setAttribute("aria-expanded", "true");
            } else {
                this.setAttribute("aria-expanded", "false");
            }
        }
    }

    attributeChangedCallback(name, oldVal, newVal){
        if(name === "input-delay"){
            this.inputDelay = parseInt(newVal);
        }
    }

    static get observedAttributes(){
        return [
            "input-delay"
        ];
    }
};

window.customElements.define("combo-box", ComboBox);

