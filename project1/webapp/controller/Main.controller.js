sap.ui.define(
  [
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/odata/v2/ODataModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/library",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
  ],
  (BaseController, JSONModel, ODataModelv2, Filter, FilterOperator, coreLibrary, MessageToast, MessageBox) => {
    "use strict";

    const ValueState = coreLibrary.ValueState;

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

        const view = this.getView();

        view?.setModel(viewModel, "view");

        const uiModel = new JSONModel({
          tabs: {
            json: { deleteEnabled: false },
            odatav2: { deleteEnabled: false },
            odatav4: { deleteEnabled: false },
          },
        });

        view?.setModel(uiModel, "ui");
        this._uiModel = uiModel;
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

        this._clearNewRecordValidation();
        this._addRecordDialog.open();
      },

      onCancelRecordCreation() {
        this._addRecordDialog.close();
      },

      _getNewRecordInputFields() {
        return {
          ID: this.byId("dialogInputId"),
          Name: this.byId("dialogInputName"),
          Author: this.byId("dialogInputAuthor"),
          Genre: this.byId("dialogInputGenre"),
          ReleaseDate: this.byId("dialogDatePicker"),
          AvailableQuantity: this.byId("dialogInputAvailableQuantity"),
        };
      },

      _clearNewRecordValidation() {
        const fields = this._getNewRecordInputFields();
        for (const field of Object.values(fields)) {
          field.setValueState(ValueState.None);
        }
      },

      _validateNewRecordModel() {
        this._clearNewRecordValidation();
        const data = this._viewModel.getProperty("/NewRecord");
        let valid = true;
        const fields = this._getNewRecordInputFields();

        ["ID", "Name", "Author", "Genre"].forEach((key) => {
          if (!data[key]) {
            fields[key].setValueState(ValueState.Error);
            valid = false;
          }
        });

        if (!data.ReleaseDate || !this.dateRegex.test(data.ReleaseDate)) {
          fields.ReleaseDate.setValueState(ValueState.Error);
          valid = false;
        }

        const quantity =
          data.AvailableQuantity !== "" && data.AvailableQuantity !== null ? Number(data.AvailableQuantity) : NaN;

        if (!Number.isInteger(quantity) || quantity < 0) {
          fields.AvailableQuantity.setValueState(ValueState.Error);
          fields.AvailableQuantity.setValueStateText(
            this.getModel("i18n").getSourceBundle().getText("dialogAddRecordErrorInvalidQuantity"),
          );
          valid = false;
        }

        return valid;
      },

      onConfirmRecordCreation() {
        if (!this._validateNewRecordModel()) {
          return;
        }

        const books = this._viewModel.getProperty("/Books");
        const newRecord = this._viewModel.getProperty("/NewRecord");

        this._viewModel.setProperty("/Books", [...books, newRecord]);
        this._addRecordDialog.close();
      },

      async _deleteSelected({ tableId, bindingModel, uiPath, deleteFn }) {
        const table = this.byId(tableId);
        const selectedItems = table.getSelectedItems();

        if (!selectedItems.length) {
          return;
        }

        const contexts = selectedItems.map((item) => item.getBindingContext(bindingModel));
        const ids = contexts.map((context) => context.getObject().ID);

        await this._openDeleteConfirmationDialog({
          displayIds: ids,
          onConfirm: async () => {
            await deleteFn({ ids, contexts });

            table.removeSelections();
            this._uiModel.setProperty(uiPath, false);
          },
        });
      },

      onDeleteRecordJson() {
        return this._deleteSelected({
          tableId: "booksTable",
          bindingModel: "view",
          uiPath: "/tabs/json/deleteEnabled",
          deleteFn: ({ ids }) => {
            const books = this._viewModel.getProperty("/Books");
            this._viewModel.setProperty(
              "/Books",
              books.filter((book) => !ids.includes(book.ID)),
            );
          },
        });
      },

      onDeleteRecordV2() {
        return this._deleteSelected({
          tableId: "productsV2Table",
          bindingModel: "v2Model",
          uiPath: "/tabs/odatav2/deleteEnabled",

          deleteFn: ({ contexts }) => {
            const odataModel = this.getModel("v2Model");
            const resourceBundle = this.getModel("i18n").getResourceBundle();

            contexts.forEach((context) => {
              odataModel.remove(context.getPath(), { groupId: "changes" });
            });

            return new Promise((resolve, reject) => {
              odataModel.submitChanges({
                groupId: "changes",
                success: (data) => {
                  const hasErrors = (data.__batchResponses?.[0]?.__changeResponses || []).some(
                    (resp) => resp.statusCode >= 400,
                  );

                  if (hasErrors) {
                    MessageBox.error(resourceBundle.getText("ODataDeletePartialFails"));
                  } else {
                    MessageToast.show(resourceBundle.getText("ODataDeleteSuccess"));
                  }

                  resolve();
                },
                error: (err) => {
                  MessageBox.error(resourceBundle.getText("ODataDeleteError"));
                  reject(err);
                },
              });
            });
          },
        });
      },

      onAnyTableSelectionChange(event) {
        const table = event.getSource();
        const propertyPath = table
          .getCustomData()
          .find((data) => data.getKey() === "deleteEnabledPath")
          ?.getValue();

        if (!propertyPath) {
          return;
        }

        this._uiModel.setProperty(propertyPath, !!table.getSelectedItems().length);
      },

      async _openDeleteConfirmationDialog({ displayIds, onConfirm }) {
        this._viewModel.setProperty("/SelectedIds", displayIds);
        this._pendingDeleteConfirmCallback = onConfirm;

        if (!this._confirmDeletionDialog) {
          this._confirmDeletionDialog = await this.loadFragment({
            name: "module:project1/fragment/ConfirmDeletionDialog",
          });
        }
        this._confirmDeletionDialog.open();
      },

      async onConfirmDeletion() {
        const confirm = this._pendingDeleteConfirmCallback;
        this._confirmDeletionDialog.close();
        this._viewModel.setProperty("/SelectedIds", []);

        if (confirm) {
          await confirm();
        }

        this._pendingDeleteConfirmCallback = null;
      },

      onCancelDeletion() {
        this._confirmDeletionDialog.close();
        this._pendingDeleteConfirmCallback = null;
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
