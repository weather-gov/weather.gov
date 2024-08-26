class AFDSelector extends HTMLElement {
  constructor(){
    super();


    // Bind methods
    this.handleAFDSelectionUpdated = this.handleAFDSelectionUpdated.bind(this);
    this.handleWFOSelectionUpdated = this.handleWFOSelectionUpdated.bind(this);
    this.disableInputs = this.disableInputs.bind(this);
    this.enableInputs = this.enableInputs.bind(this);
  }

  connectedCallback(){
    if(!this.isConnected){
      return;
    }

    let wfoSelector = document.getElementById('wfo-selector');
    if(!wfoSelector){
      wfoSelector = document.createElement("select");
      wfoSelector.id = "wfo-selector";
      this.append(wfoSelector);
    }
    wfoSelector.addEventListener('change', this.handleWFOSelectionUpdated);

    let versionSelector = document.getElementById('version-selector');
    if(!versionSelector){
      versionSelector = document.createElement('select');
      versionSelector.id = 'version-selector';
      this.append(versionSelector);
    }
    versionSelector.addEventListener('change', this.handleAFDSelectionUpdated);

    let container = this.querySelector('.afd-content');
    if(!container){
      container = document.createElement('div');
      container.classList.add('afd-content');
      this.append(container);
    }
  }


  async handleWFOSelectionUpdated(event){
    this.disableInputs();
    const wfoCode = event.target.value;
    const afdSelectElement = document.getElementById('version-selector');
    const url = `/wx/afd/locations/${wfoCode}`;
    const response = await fetch(url);
    if(response.ok){
      afdSelectElement.innerHTML = "";
      const markup = await response.text();
      afdSelectElement.innerHTML = markup;
    }
    this.enableInputs();
  }

  async handleAFDSelectionUpdated(event){
    this.disableInputs();
    const id = event.target.value;
    const afdContainer = this.querySelector('.afd-content');
    if(!afdContainer){
      return;
    }
    const response = await fetch(`/wx/afd/${id}`);
    if(response.ok){
      const markup = await response.text();
      afdContainer.outerHTML = markup;
    }
    this.enableInputs();
  }

  disableInputs(){
    Array.from(this.querySelectorAll('select')).forEach(el => {
      el.setAttribute("disabled", "true");
    });
  }

  enableInputs(){
    Array.from(this.querySelectorAll('select')).forEach(el => {
      el.removeAttribute("disabled");
    });
  }
};

window.customElements.define('wx-afd-selector', AFDSelector);
