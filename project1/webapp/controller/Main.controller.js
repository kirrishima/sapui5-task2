sap.ui.define(["sap/ui/core/mvc/Controller", "sap/ui/model/json/JSONModel"], (Controller, JSONModel) => {
  "use strict";

  return Controller.extend("project1.controller.Main", {
    onInit() {
      const model = new JSONModel("model/data.json");

      this.getView()?.setModel(model, "view");
    },
  });
});
