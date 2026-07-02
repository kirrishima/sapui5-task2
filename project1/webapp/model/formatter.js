sap.ui.define([], function () {
  "use strict";

  return {
    publishedYear(date) {
      const resourceBundle = this?.getOwnerComponent()?.getModel("i18n")?.getResourceBundle();
      return resourceBundle.getText("publishedYear", [date.split("-")[0]]);
    },
  };
});
