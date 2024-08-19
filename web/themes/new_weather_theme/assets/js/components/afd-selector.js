class AFDSelector extends HTMLElement {
  constructor(){
    super();


    // Bind methods
    this.handleWFOUpdated = this.handleWFOUpdated.bind(this);
    this.handleAFDUpdated = this.handleAFDUpdated.bind(this);
    this.afdSelectElementChanged = this.afdSelectElementChanged.bind(this);
  }

  connectedCallback(){
    if(!this.isConnected){
      return;
    }

    let container = this.querySelector('.afd-content-container');
    if(!container){
      container = document.createElement('div');
      container.classList.add('afd-content-container');
      this.append(container);
    }

    let afdSelector = this.querySelector('select.afd-selection');
    if(!afdSelector){
      afdSelector = document.createElement('select');
      afdSelector.classList.add('afd-selection');
      this.prepend(afdSelector);
    }
    afdSelector.addEventListener('change', this.afdSelectElementChanged);
  }


  async handleWFOUpdated(wfoCode){
    const url = `https://api.weather.gov/products/types/AFD/locations/${wfoCode}`;
    const response = await fetch(url);
    if(response.ok){
      const data = await response.json();
      const options = data['@graph'].map(item => {
        const option = document.createElement('option');
        option.setAttribute('value', item.id);
        option.textContent = `${item.issuanceTime}`;
        return option;
      });
      const afdSelectElement = this.querySelector('select.afd-selection');
      afdSelectElement.innerHTML = "";
      afdSelectElement.append(...options);
    }
  }

  afdSelectElementChanged(event){
    const id = event.target.value;
    this.setAttribute("afd", id);
  }

  async handleAFDUpdated(afdId){
    const afdContainer = this.querySelector('.afd-content-container');
    if(!afdContainer){
      return;
    }
    const response = await fetch(`/afd/${afdId}`);
    if(response.ok){
      const markup = await response.text();
      afdContainer.innerHTML = markup;
    }
  }

  attributeChangedCallback(name, oldVal, newVal){
    if(name === 'wfo'){
      this.handleWFOUpdated(newVal);
    } else if(name === 'afd'){
      this.handleAFDUpdated(newVal);
    }
  }

  static get observedAttributes(){
    return [
      'wfo',
      'afd'
    ];
  }
};

window.customElements.define('wx-afd-selector', AFDSelector);
