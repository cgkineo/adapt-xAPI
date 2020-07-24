define([
    './abstractStatementModel'
], function(AbstractStatementModel) {

    var CompletedStatementModel = AbstractStatementModel.extend({

        getData: function(model) {
            var statement = AbstractStatementModel.prototype.getData.apply(this, arguments);

            var modelType = model.get('_type');
            if (modelType === "course" || modelType === "page") statement.result = this.getResult(model);

            return statement;
        },
        
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
            var modelType = model.get('_type');

            switch(modelType) {
                case "course":
                    return ADL.activityTypes.course;
                case "page":
                    return ADL.activityTypes.module;
                case "component":
                    return ADL.activityTypes.interaction;
            }
        },

        getResult: function(model) {
            var result = {
                duration: this.getISO8601Duration(model.get('_totalDuration'))
            };

            return result;
        }

    });

    return CompletedStatementModel;

});