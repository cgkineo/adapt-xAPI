define([
    './abstractStatementModel'
], function(AbstractStatementModel) {

    var TerminatedStatementModel = AbstractStatementModel.extend({

        getData: function(model) {
            var statement = AbstractStatementModel.prototype.getData.apply(this, arguments);
            statement.result = this.getResult(model);

            return statement;
        },

        getVerb: function(model) {
            //return ADL.verbs.terminated;

            var verb = {
                id: "http://adlnet.gov/expapi/verbs/terminated",
                display: {}
            };

            verb.display[this.get('recipeLang')] = "terminated";

            return verb;
        },

        getActivityType: function(model) {
            return ADL.activityTypes.course;
        },

        getResult: function(model) {
            var result = {
                duration: this.getISO8601Duration(model.get('_sessionDuration'))
            };

            return result;
        }

    });

    return TerminatedStatementModel;

});
