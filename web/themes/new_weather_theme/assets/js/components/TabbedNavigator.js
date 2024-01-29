const templateString = `
<slot></slot>
`;

class TabbedNavigator extends HTMLElement {
    constructor(){
        super();

        this.template = document.createElement('template');
        this.template.innerHTML = templateString;
        this.attachShadow({mode: 'open'});
        this.shadowRoot.append(
            this.template.content.cloneNode(true)
        );

        // Bind this context to methods that need it
        this.handleHashChange = this.handleHashChange.bind(this);
        this.handleTabButtonClick = this.handleTabButtonClick.bind(this);
        this.switchToTab = this.switchToTab.bind(this);
    }
    
    connectedCallback(){
        // If no tabs are selected by default, then select the first one
        const selected = Array.from(this.querySelectorAll('.tab-button[data-selected]'));
        if(!selected.length){
            this.switchToTab(this.querySelector('button').dataset.tabName);
        }

        // Add needed event listeners
        window.addEventListener('hashchange', this.handleHashChange);
        Array.from(this.querySelectorAll('button')).forEach(button => {
            button.addEventListener('click', this.handleTabButtonClick);
        });
    }

    disconnectedCallback(){
        // Remove any event listeners
        window.removeEventListener('hashchange', this.handleHashChange);
        Array.from(this.querySelectorAll('button')).forEach(button => {
            button.removeEventListener('click', this.handleTabButtonClick);
        });
    }

    switchToTab(tabId){
        const activeElements = this.querySelectorAll('[data-selected]');
        Array.from(activeElements).forEach(activeElement => {
            activeElement.removeAttribute('data-selected');
            if(activeElement.hasAttribute('aria-expanded')){
                activeElement.setAttribute('aria-expanded', 'false');
            }
        });
        const tabButton = this.querySelector(`[data-tab-name="${tabId}"]`);
        tabButton.setAttribute('data-selected', '');
        tabButton.setAttribute('aria-expanded', 'true');
        const tabContainer = this.querySelector(`#${tabId}`);
        tabContainer.setAttribute('data-selected', '');
    }

    handleTabButtonClick(event){
        this.switchToTab(event.target.dataset.tabName);
    }

    handleHashChange(event){
        const hash = new URL(window.location).hash;
        const childElement = this.querySelector(`${hash}`);
        if(childElement){
            // If we get here, then the element referred to
            // by the document hash fragment is a child of
            // this tabbed navigator.
            // We need to toggle to the correct tab pane
            // to properly display that element.
            const tabContainer = childElement.closest('.tab-container');
            this.switchToTab(tabContainer.id);
            
        }
    }

    toggleAccordion(accordionElement, on = true){
        const button = accordionElement.querySelector('button.usa-accordion__button');
        const content = accordionElement.querySelector('.usa-accordion__content');

        if(on){
            button.setAttribute('aria-expanded', 'true');
            content.removeAttribute('hidden');
        } else {
            button.setAttribute('aria-expanded', 'false');
            content.addAttribute('hidden', '');
        }
    }
}

window.customElements.define('tabbed-nav', TabbedNavigator);
console.log("Loaded TabbedNavigator here");
