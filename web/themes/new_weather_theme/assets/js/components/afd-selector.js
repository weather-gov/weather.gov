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

    // Validate the WFO code format before using it in a URL. WFO codes are
    // always 3-letter uppercase identifiers (e.g., "OKX", "LAX", "MFL").
    // Without this validation, a manipulated <select> option value could
    // contain path traversal characters or other payloads that alter the
    // request destination. While the server should also validate, client-side
    // checks provide defense-in-depth.
    if (!/^[A-Za-z]{3}$/.test(wfoCode)) {
      this.enableInputs();
      return;
    }

    const afdSelectElement = document.getElementById('version-selector');
    const url = `/wx/afd/locations/${encodeURIComponent(wfoCode)}`;
    const response = await fetch(url);
    if(response.ok){
      // Use the DOM parser to safely parse the server's HTML response instead
      // of injecting it directly via innerHTML. Direct innerHTML assignment is
      // an XSS risk: if the server response ever reflected user input or
      // contained malicious markup (due to a server-side bug, compromised
      // upstream data, or a man-in-the-middle attack), any <script> tags or
      // event handler attributes would execute in the user's browser session.
      // The DOMParser approach creates an isolated document that doesn't
      // execute scripts, and we only extract the safe <option> elements.
      const markup = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(markup, "text/html");
      const options = doc.querySelectorAll("option");
      afdSelectElement.innerHTML = "";
      options.forEach(opt => {
        const safeOption = document.createElement("option");
        safeOption.value = opt.value;
        safeOption.textContent = opt.textContent;
        afdSelectElement.appendChild(safeOption);
      });
    }
    this.enableInputs();
  }

  async handleAFDSelectionUpdated(event){
    this.disableInputs();
    const id = event.target.value;

    // Validate the AFD product ID format before building the request URL.
    // NWS product IDs follow a predictable alphanumeric-with-hyphens pattern.
    // Rejecting unexpected characters prevents path traversal or injection
    // via a tampered <select> element.
    if (!/^[A-Za-z0-9\-]+$/.test(id)) {
      this.enableInputs();
      return;
    }

    const afdContainer = this.querySelector('.afd-content');
    if(!afdContainer){
      return;
    }
    const response = await fetch(`/wx/afd/${encodeURIComponent(id)}`);
    if(response.ok){
      // Use DOMParser to safely handle the server's HTML response instead of
      // assigning it directly via outerHTML. The previous approach was a
      // significant XSS vector: outerHTML replaces the entire element and its
      // parent context with raw HTML, which means any <script> tags, <img
      // onerror="..."> payloads, or event handler attributes in the response
      // would execute immediately in the user's browser. This is particularly
      // dangerous here because the AFD content originates from the NWS API —
      // an external source that could be compromised. DOMParser creates an
      // inert document that never executes scripts, and we selectively copy
      // only the safe content elements into the live DOM.
      const markup = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(markup, "text/html");
      const newContent = doc.querySelector('.afd-content');
      if (newContent) {
        afdContainer.innerHTML = "";
        Array.from(newContent.childNodes).forEach(child => {
          const imported = document.importNode(child, true);
          // importNode deep-clones all attributes, including inline event
          // handlers like onerror, onload, onmouseover, etc. While DOMParser
          // keeps <script> tags inert, event handler attributes become live
          // once the cloned node enters the real document. We strip all of
          // them here to close that gap.
          this.stripEventHandlers(imported);
          afdContainer.appendChild(imported);
        });
        if (newContent.dataset.afdId) {
          afdContainer.dataset.afdId = newContent.dataset.afdId;
        }
      }
    }
    this.enableInputs();
  }

  // Walk a DOM subtree and remove any inline event handler attributes
  // (anything starting with "on"). This is necessary because importNode
  // faithfully copies everything from the parsed document, and while
  // DOMParser won't execute <script> elements, event handler attributes
  // (onerror, onload, etc.) become active the moment their host element
  // hits the live DOM.
  stripEventHandlers(node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      for (const attr of Array.from(node.attributes)) {
        if (attr.name.toLowerCase().startsWith("on")) {
          node.removeAttribute(attr.name);
        }
      }
      for (const child of node.children) {
        this.stripEventHandlers(child);
      }
    }
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
