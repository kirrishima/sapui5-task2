sap.ui.define(
  ["sap/ui/core/mvc/Controller", "sap/ui/core/UIComponent", "sap/m/MessageToast", "sap/m/MessageBox"],
  function (Controller, UIComponent, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("project1.controller.BaseController", {
      getModel(name) {
        return this.getView().getModel(name);
      },

      applySubmitChanges() {
        return new Promise((resolve, reject) => {
          this._v2Model.submitChanges({
            success: () => {
              resolve();
              MessageToast.show(this._resourceBundle.getText("ODataDeleteSuccess"));
            },
            error: () => {
              reject();
              MessageBox.error(this._v2ModelresourceBundle.getText("ODataDeleteError"));
            },
          });
        });
      },
    });
  },
);
