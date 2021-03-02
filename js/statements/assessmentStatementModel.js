define([
    './abstractStatementModel'
], function(AbstractStatementModel) {

    var AssessmentStatementModel = AbstractStatementModel.extend({

        getData: function(model, state) {
            var statement = AbstractStatementModel.prototype.getData.apply(this, arguments);
            statement.verb = this.getVerb(state);
            statement.result = this.getResult(state);

            return statement;
        },

        getVerb: function(state) {
            // return if using Backbone.Model from AbstractStatementModel
            if (state.attributes) return;

            var isPass = state.isPass;
            //var verb = (isPass) ? ADL.verbs.passed : ADL.verbs.failed;
            var verbType = (isPass) ? "passed" : "failed";

            var verb = {
                id: "http://adlnet.gov/expapi/verbs/" + verbType,
                display: {}
            };

            verb.display[this.get('recipeLang')] = verbType;

            return verb;
        },

        getActivityType: function(model) {
            return ADL.activityTypes.assessment;
        },

        getResult: function(state) {
            var result = {
                score: {
                    raw: state.score,
                    min: 0,
                    max: state.maxScore,
                    scaled: state.scoreAsPercent / 100
                }/*,
                success: state.isPass,
                completion: state.isComplete*/
            };

            return result;
        }

    });

    return AssessmentStatementModel;

});
