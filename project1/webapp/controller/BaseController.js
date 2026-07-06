sap.ui.define(
  ["sap/ui/core/mvc/Controller", "sap/ui/core/UIComponent", "sap/m/MessageToast", "sap/m/MessageBox"],
  function (Controller, UIComponent, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("project1.controller.BaseController", {
      getModel(name) {
        return this.getView().getModel(name);
      },

      async applySubmitChanges({ successTextKey, errorTextKey }) {
        try {
          const data = await new Promise((resolve, reject) => {
            this._v2Model.submitChanges({
              success: resolve,
              error: reject,
            });
          });

          if (successTextKey) {
            MessageToast.show(this._resourceBundle.getText(successTextKey));
          }

          return data;
        } catch (error) {
          if (errorTextKey) {
            MessageBox.error(this._v2ModelresourceBundle.getText(errorTextKey));
          }

          throw error;
        }
      },
    });
  },
);
