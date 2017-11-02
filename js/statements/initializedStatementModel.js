define([
    'core/js/adapt',
    './abstractStatementModel'
], function(Adapt, AbstractStatementModel) {

    var InitializedStatementModel = AbstractStatementModel.extend({

        getVerb: function(model) {
            //return ADL.verbs.initialized;

            // causes issue in IE
            /*
            var verb = {
                id: "http://adlnet.gov/expapi/verbs/initialized",
                display: {
                    [this.get('lang')]: "initialized"
                }
            };
            */

            var verb = {
                id: "http://adlnet.gov/expapi/verbs/initialized",
                display: {}
            };

            verb.display[this.get('lang')] = "initialized";

            return verb;
        },

        getActivityType: function() {
            return ADL.activityTypes.course;
        }

    });

    return InitializedStatementModel;

});
