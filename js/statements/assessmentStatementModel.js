define([
    './abstractStatementModel'
], function(AbstractStatementModel) {

    var AssessmentStatementModel = AbstractStatementModel.extend({

        getData: function(model) {
            var statement = AbstractStatementModel.prototype.getData.apply(this, arguments);
            statement.result = this.getResult(model);

            return statement;
        },

        getVerb: function(model) {
            var isPass = model.get('_isPass');
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

        getResult: function(model) {
            var result = {
                score: {
                    raw: model.get('_score'),
                    min: 0,
                    max: model.get('_maxScore'),
                    scaled: model.get('_scoreAsPercent') / 100
                }/*,
                success: isPass,
                completion: model.get('_isComplete')*/
            };

            return result;
        }

    });

    return AssessmentStatementModel;

});
