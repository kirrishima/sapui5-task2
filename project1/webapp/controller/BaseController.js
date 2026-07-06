sap.ui.define(["sap/ui/core/mvc/Controller", "sap/ui/core/UIComponent"], function (Controller, UIComponent) {
  "use strict";

  return Controller.extend("project1.controller.BaseController", {
    getModel(name) {
      return this.getView().getModel(name);
    },

    applySubmitChanges() {
      return new Promise((resolve, reject) => {
        this._v2Model.submitChanges({
          success: (data) => resolve(data),
          error: (err) => reject(err),
        });
      });
    },
  });
});
