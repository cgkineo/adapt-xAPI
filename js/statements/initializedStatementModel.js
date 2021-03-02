define([
    './abstractStatementModel'
], function(AbstractStatementModel) {

    var InitializedStatementModel = AbstractStatementModel.extend({

        getVerb: function(model) {
            //return ADL.verbs.initialized;

            var verb = {
                id: "http://adlnet.gov/expapi/verbs/initialized",
                display: {}
            };

            verb.display[this.get('recipeLang')] = "initialized";

            return verb;
        },

        getActivityType: function(model) {
            return ADL.activityTypes.course;
        },

        getContextExtensions: function(model, state) {
            var extensions = AbstractStatementModel.prototype.getContextExtensions.apply(this, arguments);

            _.extend(extensions, {
                "http://id.tincanapi.com/extension/browser-info": {
                    "user-agent-header": navigator.userAgent.toString()
                }
            });

            return extensions;
        }

    });

    return InitializedStatementModel;

});
