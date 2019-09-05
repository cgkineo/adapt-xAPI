define([
    'core/js/adapt',
    './abstractStatementModel'
], function(Adapt, AbstractStatementModel) {

    var CompletedStatementModel = AbstractStatementModel.extend({

        getVerb: function(model) {
            //return ADL.verbs.completed;

            var verb = {
                id: "http://adlnet.gov/expapi/verbs/completed",
                display: {}
            };

            verb.display[this.get('recipeLang')] = "completed";

            return verb;
        },

        getActivityType: function(model) {
            var isComponent = model.get('_type') === "component";

            return (isComponent) ? ADL.activityTypes.interaction : ADL.activityTypes.module;
        }

    });

    return CompletedStatementModel;

});