sap.ui.define(
  [
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Text",
    "sap/m/library",
  ],
  (BaseController, JSONModel, Filter, FilterOperator, Dialog, Button, Text, mobileLibrary) => {
    "use strict";

    return BaseController.extend("project1.controller.Main", {
      onInit() {
        const viewModel = new JSONModel("model/data.json");
        viewModel.attachRequestCompleted(() => {
          const books = viewModel.getProperty("/Books");

          // Edit mode
          const newBooks = books.map((book) => ({ ...book, IsEditing: false }));
          viewModel.setProperty("/Books", newBooks);

          // The Delete button will not be enabled unless at least one row is selected
          viewModel.setProperty("/IsDeleteButtonEnabled", false);

          // Genres filter
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

      onAddRecord() {
        const model = this.getModel("view");
        const books = model?.getProperty("/Books");

        const idNumbers = books.map((book) => {
          const num = parseInt(book.ID?.replace("ID", "") ?? "0", 10);
          return isNaN(num) ? 0 : num;
        });

        const maxIdNum = Math.max(0, ...idNumbers);
        const newId = "ID" + (maxIdNum + 1);

        // correct creating
        books.push({
          ID: newId,
          IsEditing: false,
          Name: "",
          Author: "",
          Genre: "",
          ReleaseDate: new Date().toISOString().split("T")[0],
          AvailableQuantity: 0,
        });

        model.setProperty("/Books", books);
      },

      onDeleteRecord() {
        const table = this.byId("booksTable");
        const selectedItems = table?.getSelectedItems();

        const selectedIds = selectedItems.map((item) => item.getBindingContext("view").getObject().ID);

        if (selectedIds.length > 0 && !this.confirmDeletionDialog) {
          const resourceBundle = this.getView().getModel("i18n").getResourceBundle();
          const titleText = resourceBundle.getText("dialogConfirmDeletionTitle", [selectedIds.join(", ")]);
          const contentText = resourceBundle.getText("dialogConfirmDeletionContent");
          const confirmButtonText = resourceBundle.getText("dialogConfirmDeletionConfirmButton");
          const cancelButtonText = resourceBundle.getText("dialogConfirmDeletionCancelButton");

          this.confirmDeletionDialog = new Dialog({
            type: mobileLibrary.DialogType.Message,
            title: titleText,
            content: new Text({ text: contentText }),
            beginButton: new Button({
              type: mobileLibrary.ButtonType.Emphasized,
              text: confirmButtonText,
              press: () => {
                const model = this.getModel("view");
                const books = model?.getProperty("/Books");
                const filteredBooks = books.filter((book) => !selectedIds.includes(book.ID));
                model?.setProperty("/Books", filteredBooks);
                table?.removeSelections();
                this.getModel("view")?.setProperty("/IsDeleteButtonEnabled", false);

                this.confirmDeletionDialog.close();
                this.confirmDeletionDialog = null;
              },
            }),
            endButton: new Button({
              text: cancelButtonText,
              press: () => {
                this.confirmDeletionDialog.close();
                this.confirmDeletionDialog = null;
              },
            }),
          });

          this.confirmDeletionDialog.open();
        }
      },

      onTableSelectionChange(event) {
        const selectedItemsCount = this.byId("booksTable")?.getSelectedItems()?.length ?? 0;

        this.getModel("view")?.setProperty("/IsDeleteButtonEnabled", selectedItemsCount > 0);
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
