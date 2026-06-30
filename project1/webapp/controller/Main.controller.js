sap.ui.define(
  ["./BaseController", "sap/ui/model/json/JSONModel", "sap/ui/model/Filter", "sap/ui/model/FilterOperator"],
  (BaseController, JSONModel, Filter, FilterOperator) => {
    "use strict";

    return BaseController.extend("project1.controller.Main", {
      onInit() {
        const viewModel = new JSONModel("model/data.json");
        viewModel.attachRequestCompleted(() => {
          const books = viewModel.getProperty("/Books");

          // Edit mode
          const newBooks = books.map((book) => ({ ...book, IsEditing: false }));
          viewModel.setProperty("/Books", newBooks);

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

        books.push({ ID: newId });

        model.setProperty("/Books", books);
      },

      onDeleteRecord() {
        const model = this.getModel("view");
        const books = model?.getProperty("/Books");

        const table = this.byId("booksTable");
        const selectedItems = table?.getSelectedItems();

        const selectedIds = selectedItems.map((item) => item.getBindingContext("view").getObject().ID);
        const filteredBooks = books.filter((book) => !selectedIds.includes(book.ID));

        model?.setProperty("/Books", filteredBooks);
        table?.removeSelections();
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
