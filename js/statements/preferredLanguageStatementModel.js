define([
    './preferredStatementModel'
], function(PreferredStatementModel) {

    var PreferredLanguageStatementModel = PreferredStatementModel.extend({

        getData: function(model, lang) {
            var statement = PreferredStatementModel.prototype.getData.call(this, model);

            statement.result = this.getResult(model, lang);

            return statement;
        },

        getActivityType: function(model) {
            return ADL.activityTypes.course;
        },

        getResult: function(model, lang) {
            var result = {
                response: lang
            };

            return result;
        }

    });

    return PreferredLanguageStatementModel;

});
