define([
    'core/js/adapt',
    './questionStatementModel'
], function(Adapt, QuestionStatementModel) {

    var DELIMETER = "[,]";

    var TextInputStatementModel = QuestionStatementModel.extend({

        getCorrectResponsesPattern: function(model) {
            var correctAnswers = model.get('_answers');
            
            // do specific answers work against the specification when there is more than one input?
            // Where the criteria for a question are complex and correct responses cannot be exhaustively listed, Learning Record Providers are discouraged from using the "correctResponsesPattern" property.
            if (!correctAnswers) correctAnswers = _.pluck(model.get('_items'), '_answers');

            return _.flatten(correctAnswers);
        },

        getResponse: function(model) {
            var response = _.pluck(model.get('_items'), 'userAnswer');              
            return response.join(DELIMETER);
        }

    });

    return TextInputStatementModel;

});
