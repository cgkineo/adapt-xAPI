define([
    'core/js/adapt',
    './abstractStatementModel'
], function(Adapt, AbstractStatementModel) {

    var ExperiencedStatementModel = AbstractStatementModel.extend({

        getData: function(model) {
            var statement = AbstractStatementModel.prototype.getData.apply(this, arguments);
            statement.result = this.getResult(model);

            return statement;
        },

        getVerb: function(model) {
            //return ADL.verbs.experienced;

            // causes issue in IE
            /*
            var verb = {
                id: "http://adlnet.gov/expapi/verbs/experienced",
                display: {
                    [this.get('lang')]: "experienced"
                }
            };
            */

            var verb = {
                id: "http://adlnet.gov/expapi/verbs/experienced",
                display: {}
            };

            verb.display[this.get('lang')] = "experienced";

            return verb;
        },

        getActivityType: function() {
            return ADL.activityTypes.module;
        },

        getResult: function(model) {
            var result = {
                duration: this.getISO8601Duration(model)
            };

            return result;
        }

    });

    return ExperiencedStatementModel;

});
