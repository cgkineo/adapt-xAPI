define([
    'core/js/adapt',
    './abstractStatementModel'
], function(Adapt, AbstractStatementModel) {

    var ResourceItemStatementModel = AbstractStatementModel.extend({

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

        getActivityType: function(model) {
            return "http://id.tincanapi.com/activitytype/resource";
        },

        getName: function(model) {
            // causes issue in IE
            /*
            var name = {
                [this.get('lang')]: model.get('title')
            };
            */

            var name = {};
            name[this.get('lang')] = model.get('title');

            return name;
        },

        getObject: function(model) {
            var object = AbstractStatementModel.prototype.getObject.apply(this, arguments);

            _.extend(object.definition, {
                description: this.getDescription(model),
                moreInfo: model.get('url')
            });

            return object;
        },

        getDescription: function(model) {
            /*
            var description = {
                [this.get('lang')]: model.get('description')
            };
            */

            var description = {};
            description[this.get('lang')] = model.get('description');

            return description;
        }

    });

    return ResourceItemStatementModel;

});
