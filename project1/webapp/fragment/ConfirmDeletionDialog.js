sap.ui.define(
  ["sap/m/Dialog", "sap/m/Button", "sap/m/Text", "sap/m/library"],
  (Dialog, Button, Text, mobileLibrary) => {
    "use strict";

    return {
      createContent: (controller) => {
        return new Dialog({
          type: mobileLibrary.DialogType.Message,

          title: {
            path: "view>/SelectedIds",
            formatter: (ids) => {
              const bundle = controller.getView().getModel("i18n").getResourceBundle();
              return bundle.getText("dialogConfirmDeletionTitle", [ids.join(", ")]);
            },
          },

          content: [new Text({ text: "{i18n>dialogConfirmDeletionContent}" })],

          beginButton: new Button({
            type: mobileLibrary.ButtonType.Emphasized,
            text: "{i18n>dialogConfirmDeletionConfirmButton}",
            press: () => {
              controller.onConfirmDeletion();
            },
          }),

          endButton: new Button({
            text: "{i18n>dialogConfirmDeletionCancelButton}",
            press: () => {
              controller.onCancelDeletion();
            },
          }),
        });
      },
    };
  },
);
