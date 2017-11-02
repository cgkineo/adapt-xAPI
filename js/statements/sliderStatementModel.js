define([
    'core/js/adapt',
    './questionStatementModel'
], function(Adapt, QuestionStatementModel) {

    var DELIMETER = "[:]";

    var SliderStatementModel = QuestionStatementModel.extend({

        getCorrectResponsesPattern: function(model) {
            var correctAnswer = model.get('_correctAnswer');
            if (correctAnswer) return [correctAnswer];

            var correctRange = model.get('_correctRange');
            if (correctRange) {
                var bottom = correctRange._bottom || "";
                var top = correctRange._top || "";
                
                return [
                    bottom + DELIMETER + top
                ];
            }
        },

        getResponse: function(model) {
            var response = model.get('_userAnswer');              
            return response.toString();
        }

    });

    return SliderStatementModel;

});
