sap.ui.define(
  [
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
  ],
  (BaseController, JSONModel, Filter, FilterOperator, MessageToast) => {
    "use strict";

    return BaseController.extend("project1.controller.Main", {
      onInit() {
        this.dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        const viewModel = new JSONModel("model/data.json");

        viewModel.attachRequestCompleted(() => {
          const books = viewModel.getProperty("/Books");
          const newBooks = books.map((book) => ({ ...book, IsEditing: false }));

          viewModel.setData({ Books: newBooks, IsDeleteButtonEnabled: false });
          this._viewModel = viewModel;

          const genres = [...new Set(books.map((book) => book.Genre))].map((genre) => ({
            key: genre,
            text: genre,
          }));

          genres.unshift({ key: "All", text: "All" });
          const filtersModel = new JSONModel({ genres });
          this.getView().setModel(filtersModel, "filters");
        }, this);

        this.getView()?.setModel(viewModel, "view");
      },

      async onAddRecord() {
        const idNumbers = this._viewModel.getProperty("/Books").map((book) => {
          const num = parseInt(book.ID?.replace("ID", "") ?? "0", 10);
          return isNaN(num) ? 0 : num;
        });

        const maxIdNum = Math.max(0, ...idNumbers);
        const newId = "ID" + (maxIdNum + 1);

        this._viewModel.setProperty("/NewRecord", {
          ID: newId,
          IsEditing: false,
          Name: "",
          Author: "",
          Genre: "",
          ReleaseDate: new Date().toISOString().split("T")[0],
          AvailableQuantity: 0,
        });

        if (!this._addRecordDialog) {
          this._addRecordDialog = await this.loadFragment({
            name: "project1.view.AddRecordDialog",
          });
        }

        this._addRecordDialog.open();
      },

      onCancelRecordCreation() {
        this._addRecordDialog.close();
      },

      _validateNewRecordModel() {
        const data = this._viewModel.getProperty("/NewRecord");
        const quantity =
          data.AvailableQuantity !== "" && data.AvailableQuantity !== null ? Number(data.AvailableQuantity) : NaN;

        return Boolean(
          data.ID &&
          data.Name &&
          data.Author &&
          data.Genre &&
          data.ReleaseDate &&
          this.dateRegex.test(data.ReleaseDate) &&
          // Проверяем, что это целое число, оно конечно (не Infinity) и >= 0
          Number.isInteger(quantity) &&
          quantity >= 0,
        );
      },

      onConfirmRecordCreation() {
        if (!this._validateNewRecordModel()) {
          const resourceBundle = this.getModel("i18n").getResourceBundle();
          MessageToast.show(resourceBundle.getText("dialogAddRecordInvalidFieldsMsg"));
          return;
        }

        const books = this._viewModel.getProperty("/Books");
        const newRecord = this._viewModel.getProperty("/NewRecord");

        this._viewModel.setProperty("/Books", [...books, newRecord]);
        this._addRecordDialog.close();
      },

      async onDeleteRecord() {
        const selectedItems = this.byId("booksTable").getSelectedItems();
        const selectedIds = selectedItems.map((item) => item.getBindingContext("view").getObject().ID);

        if (!selectedIds.length) {
          return;
        }

        this._viewModel.setProperty("/SelectedIds", selectedIds);

        if (!this._confirmDeletionDialog) {
          this._confirmDeletionDialog = await this.loadFragment({
            name: "module:project1/fragment/ConfirmDeletionDialog",
          });
        }

        this._confirmDeletionDialog.open();
      },

      onTableSelectionChange(event) {
        this.getModel("view")?.setProperty(
          "/IsDeleteButtonEnabled",
          !!this.byId("booksTable")?.getSelectedItems()?.length,
        );
      },

      onConfirmDeletion() {
        const selectedIds = this._viewModel.getProperty("/SelectedIds");
        const books = this._viewModel.getProperty("/Books");

        this._viewModel.setProperty(
          "/Books",
          books.filter((book) => !selectedIds.includes(book.ID)),
        );

        this.byId("booksTable").removeSelections();
        this._viewModel.setProperty("/IsDeleteButtonEnabled", false);
        this._viewModel.setProperty("/SelectedIds", []);

        this._confirmDeletionDialog.close();
      },

      onCancelDeletion() {
        this._confirmDeletionDialog.close();
      },

      onFilter(event) {
        const filters = [].concat(this._getFilterForName(), this._getFilterForGenres());

        const table = this.byId("booksTable");
        const binding = table.getBinding("items");
        binding?.filter(filters);
      },

      _getFilterForName() {
        const filter = [];
        const query = this.byId("searchByTitleInput")?.getValue();

        if (query) {
          filter.push(new Filter("Name", FilterOperator.Contains, query));
        }

        return filter;
      },

      _getFilterForGenres() {
        const filter = [];
        const selectedItem = this.byId("genreFilterSelect")?.getSelectedItem();
        const key = selectedItem?.getKey();

        if (key != "All") {
          filter.push(new Filter("Genre", FilterOperator.EQ, key));
        }

        return filter;
      },

      onEditPress(event) {
        const context = event.getSource().getBindingContext("view");
        context.getModel().setProperty(context.getPath() + "/IsEditing", true);
      },

      onSavePress(event) {
        const context = event.getSource().getBindingContext("view");
        context.getModel().setProperty(context.getPath() + "/IsEditing", false);
      },
    });
  },
);
