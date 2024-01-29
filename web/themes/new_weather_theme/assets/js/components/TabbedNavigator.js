const templateString = `
<style>

</style>
<div id="tab-area">
<slot name="tabs"></slot>
</div>
<slot></slot>
`

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
    }
    
    connectedCallback(){
        window.addEventListener('hashchange', this.handleHashChange);
    }

    disconnectedCallback(){
        window.removeEventListener('hashchange', this.handleHashChange);
    }

    handleHashChange(event){
        const hash = new URL(window.location).hash;
        // If the hash is itself the alerts section, then
        // early return
        if(hash == "#alerts"){
            return;
        }
        const foundAlertElement = document.querySelector(hash);
        const foundAlertAccordionButton = foundAlertElement.querySelector('button.usa-accordion__button');
        const alertTabButtonElement = this.querySelector('.tab-link[data-tab-name="alerts"]');
        if(foundAlertElement && alertTabButtonElement){
            alertTabButtonElement.click();
            // Collapse all other alert accordions
            // and ensure that the one we care about is opened
            const accordionEl = foundAlertElement.closest('.usa-accordion');
            this.toggleAccordion(accordionEl, true);
            foundAlertElement.scrollIntoView();
            foundAlertAccordionButton.focus();
            
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
