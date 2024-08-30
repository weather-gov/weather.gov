/* global ComboBox */

class AFDSelectorWFOComboBox extends ComboBox {
  constructor() {
    super();

    this.submit = this.submit.bind(this);
  }

  submit() {
    // Submit is a noop for this combobox
  }
}

window.customElements.define("wx-combo-box-afd-wfo", AFDSelectorWFOComboBox);
