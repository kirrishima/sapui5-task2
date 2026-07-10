sap.ui.define(["sap/ui/model/json/JSONModel", "sap/ui/Device"], function (JSONModel, Device) {
  "use strict";

  return {
    /**
     * Provides runtime information for the device the UI5 app is running on as a JSONModel.
     * @returns {sap.ui.model.json.JSONModel} The device model.
     */
    createDeviceModel: function () {
      var oModel = new JSONModel(Device);
      oModel.setDefaultBindingMode("OneWay");
      return oModel;
    },

    createUIModel(_resourceBundle) {
      const uiModel = new JSONModel({
        selectedTab: "jsonmodel",
        tabs: {
          json: { deleteEnabled: false },
          odatav2: {
            deleteEnabled: false,
            sortableColumns: [
              { key: "", text: _resourceBundle.getText("odatav2SortNoneOption") },
              { key: "ID", text: _resourceBundle.getText("columnOdataV2Id") },
              { key: "Name", text: _resourceBundle.getText("columnOdataV2Name") },
              { key: "Description", text: _resourceBundle.getText("columnOdataV2Description") },
              { key: "ReleaseDate", text: _resourceBundle.getText("columnOdataV2ReleaseDate") },
              { key: "DiscontinuedDate", text: _resourceBundle.getText("columnOdataV2DiscontinuedDate") },
              { key: "Rating", text: _resourceBundle.getText("columnOdataV2Rating") },
              { key: "Price", text: _resourceBundle.getText("columnOdataV2Price") },
            ],
          },
          odatav4: { deleteEnabled: false },
        },
      });

      return uiModel;
    },

    createViewModel() {
      const viewModel = new JSONModel("model/data.json");
      viewModel.attachRequestCompleted(() => {
        const books = viewModel.getProperty("/Books");
        const newBooks = books.map((book) => ({ ...book, IsEditing: false }));

        viewModel.setData({ Books: newBooks, IsDeleteButtonEnabled: false });

        const genres = [...new Set(books.map((book) => book.Genre))].map((genre) => ({
          key: genre,
          text: genre,
        }));

        genres.unshift({ key: "All", text: "All" });
        const filtersModel = new JSONModel({ genres });
        this.getView().setModel(filtersModel, "filters");
      }, this);

      return viewModel;
    },
  };
});
