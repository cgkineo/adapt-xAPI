define([
    './abstractStatementModel'
], function(AbstractStatementModel) {

    var ExperiencedStatementModel = AbstractStatementModel.extend({

        getData: function(model) {
            var statement = AbstractStatementModel.prototype.getData.apply(this, arguments);
            statement.result = this.getResult(model);

            return statement;
        },

        getVerb: function(model) {
            //return ADL.verbs.experienced;

            var verb = {
                id: "http://adlnet.gov/expapi/verbs/experienced",
                display: {}
            };

            verb.display[this.get('recipeLang')] = "experienced";

            return verb;
        },

        getActivityType: function(model) {
            return ADL.activityTypes.module;
        },

        getResult: function(model) {
            var result = {
                duration: this.getISO8601Duration(model.get('_sessionDuration'))
            };

            return result;
        }

    });

    return ExperiencedStatementModel;

});
