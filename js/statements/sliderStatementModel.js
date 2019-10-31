define([
    './questionStatementModel'
], function(QuestionStatementModel) {

    var DELIMETER = "[:]";

    var SliderStatementModel = QuestionStatementModel.extend({

        getInteractionObject: function(model) {
            var definition = {
                correctResponsesPattern: this.getCorrectResponsesPattern(model)
            };

            return definition;
        },

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
        }

    });

    return SliderStatementModel;

});
