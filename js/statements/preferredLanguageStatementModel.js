define([
    './preferredStatementModel'
], function(PreferredStatementModel) {

    var PreferredLanguageStatementModel = PreferredStatementModel.extend({

        getData: function(model, lang) {
            var statement = PreferredStatementModel.prototype.getData.apply(this, arguments);

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
