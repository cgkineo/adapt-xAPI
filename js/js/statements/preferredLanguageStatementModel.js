define([
  './preferredStatementModel'
], function(PreferredStatementModel) {

  const PreferredLanguageStatementModel = PreferredStatementModel.extend({

    getData: function(model, lang) {
      const statement = PreferredStatementModel.prototype.getData.apply(this, arguments);

      statement.result = this.getResult(model, lang);

      return statement;
    },

    getActivityType: function(model) {
      return ADL.activityTypes.course;
    },

    getResult: function(model, lang) {
      const result = {
        response: lang
      };

      return result;
    }

  });

  return PreferredLanguageStatementModel;

});
