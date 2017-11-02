define([
    'core/js/adapt',
    './abstractStatementModel'
], function(Adapt, AbstractStatementModel) {

    var FavouriteStatementModel = AbstractStatementModel.extend({

        getVerb: function(model) {
            // causes issue in IE
            /*
            var verb = {
                id: "http://activitystrea.ms/schema/1.0/favorite",
                display: {
                    display[this.get('lang')]: "favorite"
                }
            };
            */

            var verb = {
                id: "http://activitystrea.ms/schema/1.0/favorite",
                display: {}
            };

            verb.display[this.get('lang')] = "favorite";

            return verb;
        },

        getActivityType: function() {
            return ADL.activityTypes.module;
        }

    });

    return FavouriteStatementModel;

});
