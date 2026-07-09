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
              MessageBox.error(this._resourceBundle.getText("ODataDeleteError"));
            },
          });
        });
      },

      async deleteContextsV4(contexts) {
        if (!contexts || contexts.length === 0) {
          return Promise.resolve();
        }

        const deletionPromises = contexts.map((context) => context.delete());

        try {
          await Promise.all(deletionPromises);
          MessageToast.show(this._resourceBundle.getText("ODataDeleteSuccess"));
        } catch (error) {
          MessageBox.error(this._resourceBundle.getText("ODataDeleteError"));
          throw error;
        }
      },

      updateActionEnablement(table, model, modelPath) {
        model.setProperty(modelPath, !!table.getSelectedItems().length);
      },
    });
  },
);
