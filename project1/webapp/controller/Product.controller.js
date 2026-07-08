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

    async _onProductRouteMatched(event) {
      const productID = event.getParameter("arguments").ProductID;

      if (productID == null) {
        return;
      }

      await this._v2Model.metadataLoaded();

      const productPath = this._v2Model.createKey("/Products", {
        ID: Number(productID),
      });

      this._v2Model.read(productPath, {
        urlParameters: {
          $expand: "Supplier",
        },
        success: (product) => {
          this._viewModel.setData(product);
        },
        error: () => {
          this._viewModel.setData({});
        },
      });
    },
  });
});
