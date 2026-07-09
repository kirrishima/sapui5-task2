sap.ui.define(["./BaseController", "sap/ui/model/json/JSONModel"], (BaseController, JSONModel) => {
  "use strict";

  return BaseController.extend("project1.controller.Product", {
    onInit() {
      const viewModel = new JSONModel({});
      this.getView().setModel(viewModel, "view");

      this._viewModel = viewModel;
      this._v2Model = this.getOwnerComponent().getModel("v2Model");
      this.getOwnerComponent().getRouter().getRoute("RouteProduct").attachMatched(this._onProductRouteMatched, this);
    },

    _onProductRouteMatched(event) {
      const productID = event.getParameter("arguments").ProductID;

      if (productID == null) {
        return;
      }

      const productPath = this._v2Model.createKey("/Products", {
        ID: Number(productID),
      });

      this.getView().bindElement({ path: productPath, model: "v2Model", parameters: { expand: "Supplier" } });
    },
  });
});
