define([
    'core/js/adapt',
    './abstractStatementModel'
], function(Adapt, AbstractStatementModel) {

    var UnfavouriteStatementModel = AbstractStatementModel.extend({

        getVerb: function(model) {
            var verb = {
                id: "http://activitystrea.ms/schema/1.0/unfavorite",
                display: {}
            };

            verb.display[this.get('recipeLang')] = "unfavorite";

            return verb;
        },

        getActivityType: function(model) {
            return ADL.activityTypes.module;
        }

    });

    return UnfavouriteStatementModel;

});
