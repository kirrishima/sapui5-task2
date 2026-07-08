sap.ui.define(
  [
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/odata/v2/ODataModel",
    "sap/ui/model/Sorter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/library",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
  ],
  (BaseController, JSONModel, ODataModelv2, Sorter, Filter, FilterOperator, coreLibrary, MessageToast, MessageBox) => {
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

        this._v2Model = this.getOwnerComponent().getModel("v2Model");
        this._resourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();

        const uiModel = new JSONModel({
          selectedTab: "jsonmodel",
          tabs: {
            json: { deleteEnabled: false },
            odatav2: {
              deleteEnabled: false,
              sortableColumns: [
                { key: "", text: this._resourceBundle.getText("odatav2SortNoneOption") },
                { key: "ID", text: this._resourceBundle.getText("columnOdataV2Id") },
                { key: "Name", text: this._resourceBundle.getText("columnOdataV2Name") },
                { key: "Description", text: this._resourceBundle.getText("columnOdataV2Description") },
                { key: "ReleaseDate", text: this._resourceBundle.getText("columnOdataV2ReleaseDate") },
                { key: "DiscontinuedDate", text: this._resourceBundle.getText("columnOdataV2DiscontinuedDate") },
                { key: "Rating", text: this._resourceBundle.getText("columnOdataV2Rating") },
                { key: "Price", text: this._resourceBundle.getText("columnOdataV2Price") },
              ],
            },
            odatav4: { deleteEnabled: false },
          },
        });

        view?.setModel(uiModel, "ui");
        this._uiModel = uiModel;

        const router = this.getOwnerComponent().getRouter();
        router.getRoute("RouteTab").attachMatched(this._onTabRouteMatched, this);
      },

      onTabSelect(event) {
        const tabKey = event.getParameter("key");
        this.getOwnerComponent().getRouter().navTo("RouteTab", { tabKey });
      },

      _onTabRouteMatched(event) {
        const tabKey = event.getParameter("arguments").tabKey;
        const allowedKeys = ["jsonmodel", "odatav2", "odatav4"];

        if (!allowedKeys.includes(tabKey)) {
          this.getOwnerComponent().getRouter().navTo("RouteTab", { tabKey: "jsonmodel" }, true);
          return;
        }

        this._uiModel.setProperty("/selectedTab", tabKey);
      },

      onNavToProducts(event) {
        const id = event.getSource()?.getBindingContext("v2Model")?.getProperty("ID");

        if (id == null) {
          return;
        }

        this.getOwnerComponent().getRouter().navTo("RouteProduct", { ProductID: id }, true);
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

      _clearNewRecordValidation() {
        [
          "dialogInputId",
          "dialogInputName",
          "dialogInputAuthor",
          "dialogInputGenre",
          "dialogDatePicker",
          "dialogInputAvailableQuantity",
        ].forEach((id) => this.byId(id)?.setValueState(ValueState.None));
      },

      _validateNewRecordModel() {
        this._clearNewRecordValidation();
        const data = this._viewModel.getProperty("/NewRecord");
        let valid = true;

        [
          ["ID", "dialogInputId"],
          ["Name", "dialogInputName"],
          ["Author", "dialogInputAuthor"],
          ["Genre", "dialogInputGenre"],
        ].forEach(([key, id]) => {
          if (!data[key]) {
            this.byId(id).setValueState(ValueState.Error);
            valid = false;
          }
        });

        if (!data.ReleaseDate || !this.dateRegex.test(data.ReleaseDate)) {
          this.byId("dialogDatePicker").setValueState(ValueState.Error);
          valid = false;
        }

        const quantity =
          data.AvailableQuantity !== "" && data.AvailableQuantity !== null ? Number(data.AvailableQuantity) : NaN;

        if (!Number.isInteger(quantity) || quantity < 0) {
          const quantityInput = this.byId("dialogInputAvailableQuantity");
          quantityInput.setValueState(ValueState.Error);
          quantityInput.setValueStateText(
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

      onDeleteRecordJson() {
        const table = this.byId("booksTable");
        const selectedItems = table.getSelectedItems();

        if (!selectedItems.length) {
          return;
        }

        const contexts = selectedItems.map((item) => item.getBindingContext("view"));
        const ids = contexts.map((context) => context.getObject().ID);

        MessageBox.confirm(this._resourceBundle.getText("dialogConfirmDeletionContent", [contexts.length]), {
          title: this._resourceBundle.getText("dialogConfirmDeletionTitle"),
          onClose: async (actionText) => {
            if (actionText === MessageBox.Action.OK) {
              const books = this._viewModel.getProperty("/Books");
              this._viewModel.setProperty(
                "/Books",
                books.filter((book) => !ids.includes(book.ID)),
              );

              table.removeSelections();
              this._uiModel.setProperty("/tabs/json/deleteEnabled", false);
            }
          },
        });
      },

      onDeleteRecordV2() {
        const table = this.byId("productsV2Table");
        const selectedItems = table.getSelectedItems();

        if (!selectedItems.length) {
          return;
        }

        const contexts = selectedItems.map((item) => item.getBindingContext("v2Model"));

        MessageBox.confirm(this._resourceBundle.getText("dialogConfirmDeletionContent", [contexts.length]), {
          title: this._resourceBundle.getText("dialogConfirmDeletionTitle"),
          onClose: async (actionText) => {
            if (actionText === MessageBox.Action.OK) {
              contexts.forEach((context) => {
                this._v2Model.remove(context.getPath(), { groupId: "changes" });
              });

              try {
                await this.applySubmitChanges();

                table.removeSelections();
                this._uiModel.setProperty("/tabs/odatav2/deleteEnabled", false);
              } catch {}
            }
          },
        });
      },

      _setDialogControlsByFieldGroupIdValueState(dialog, fieldGroup, state) {
        const controls = dialog.getControlsByFieldGroupId(fieldGroup);
        controls.forEach((control) => {
          if ((control.isA("sap.m.Input") || control.isA("sap.m.DatePicker")) && control.getBinding("value")) {
            control.setValueState(state);
          }
        });
      },

      async _openAddNewProductOdataV2Dialog({ context }) {
        if (!this._addNewProductOdataV2Dialog) {
          this._addNewProductOdataV2Dialog = await this.loadFragment({
            name: "project1.view.AddOdataV2Products",
          });
        }

        this._setDialogControlsByFieldGroupIdValueState(this._addNewProductOdataV2Dialog, "odatav2ProductForm", "None");

        this._addNewProductOdataV2Dialog.setBindingContext(context, "v2Model");
        this._addNewProductOdataV2Dialog.open();
      },

      async onAddRecordOdataV2() {
        var iNewId = Math.floor(Date.now() / 1_000_000);

        this._newOdataV2ProductContext = this._v2Model.createEntry("/Products", {
          properties: {
            ID: iNewId,
            Name: "",
            Description: "",
            ReleaseDate: new Date(),
            DiscontinuedDate: null,
            Rating: 0,
            Price: "0",
          },
        });

        await this._openAddNewProductOdataV2Dialog({
          context: this._newOdataV2ProductContext,
        });
      },

      async onEditRecordOdataV2(event) {
        const context = event.getSource().getBindingContext("v2Model");
        this._uiModel.setProperty("/tabs/odatav2/EditedProduct", context.getObject());

        if (!this._editProductOdataV2Dialog) {
          this._editProductOdataV2Dialog = await this.loadFragment({
            name: "project1.view.EditOdataV2Products",
          });
        }

        this._setDialogControlsByFieldGroupIdValueState(
          this._editProductOdataV2Dialog,
          "odatav2EditProductForm",
          "None",
        );

        this._editProductOdataV2Dialog.open();
        this._editingOdataV2ProductPath = context.getPath();
      },

      onEditProductOdataV2Confirm() {
        const controls = this._editProductOdataV2Dialog.getControlsByFieldGroupId("odatav2EditProductForm");
        if (!this._validateFieldGroup(controls)) {
          return;
        }

        this._v2Model.update(
          this._editingOdataV2ProductPath,
          this._uiModel.getProperty("/tabs/odatav2/EditedProduct"),
          {
            success: (data) => {
              MessageToast.show(this._resourceBundle.getText("createODataV2RecordDialogSuccessMessage"));
              this._editProductOdataV2Dialog.close();
              this._editingOdataV2ProductPath = null;
              this._uiModel.setProperty("/tabs/odatav2/EditedProduct", null);
            },
            error: () =>
              MessageBox.error(this._resourceBundle.getText("createODataV2RecordDialogCrationFailedMessage")),
          },
        );
      },

      onEditProductOdataV2Cancel() {
        if (this._editingOdataV2ProductPath) {
          this._uiModel.setProperty("/tabs/odatav2/EditedProduct", null);
          this._editingOdataV2ProductPath = null;
        }

        this._editProductOdataV2Dialog.close();
      },

      onCreateODataV2Record() {
        const controls = this._addNewProductOdataV2Dialog.getControlsByFieldGroupId("odatav2ProductForm");
        if (!this._validateFieldGroup(controls)) {
          return;
        }

        this._v2Model.submitChanges({
          success: (data) => {
            MessageToast.show(this._resourceBundle.getText("createODataV2RecordDialogSuccessMessage"));
            this._addNewProductOdataV2Dialog.close();
            this._newOdataV2ProductContext = null;
          },
          error: () => MessageBox.error(this._resourceBundle.getText("createODataV2RecordDialogCrationFailedMessage")),
        });
      },

      onCancelODataV2RecordCreation() {
        if (this._newOdataV2ProductContext) {
          this._v2Model.deleteCreatedEntry(this._newOdataV2ProductContext);
          this._newOdataV2ProductContext = null;
        }

        this._addNewProductOdataV2Dialog.close();
      },

      _validateFieldGroup(controls) {
        const results = controls.map((control) => {
          const value = control.getBinding("value")?.getValue();
          let isValid = true;
          if (control.isA("sap.m.Input") && control.getBinding("value") && control.getRequired()) {
            const localId = this.getView().getLocalId(control.getId());
            if (control.getName() === "ReleaseRating") {
              const numValue = Number(value);
              isValid = value != null && numValue >= 0 && numValue <= 5;
            } else if (control.getName() === "Price") {
              const numValue = Number(value);
              isValid = value != null && numValue >= 0;
            } else {
              isValid = !!value;
            }
          }
          if (control.isA("sap.m.DatePicker") && control.getBinding("value")) {
            const dateValue = control.getDateValue();
            const isRequired = control.getRequired();
            const isEmpty = !value || !dateValue;

            if (isRequired && isEmpty) {
              isValid = false;
            } else if (!isEmpty && !control.isValidValue()) {
              isValid = false;
            }
          }

          control.setValueState?.(isValid ? "None" : "Error");
          return isValid;
        });

        return results.every(Boolean);
      },

      onOdataV2Search(event) {
        const value = event.getParameter("value");
        const filters = [];

        if (value) {
          filters.push(
            new Filter({
              path: "Name",
              operator: FilterOperator.Contains,
              value1: value,
              caseSensitive: false,
            }),
          );
        }

        this.byId("productsV2Table")?.getBinding("items")?.filter(filters);
      },

      onOdataV2Sort(event) {
        const selectedKey = event.getParameter("selectedItem")?.getKey();
        let sorter = selectedKey ? new Sorter({ path: selectedKey, descending: true }) : [];

        this.byId("productsV2Table")?.getBinding("items")?.sort(sorter);
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
