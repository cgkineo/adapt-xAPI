define([
  './questionStatementModel'
], function(QuestionStatementModel) {

  const DELIMETER = '[:]';

  const SliderStatementModel = QuestionStatementModel.extend({

    getInteractionObject: function(model) {
      const definition = {
        correctResponsesPattern: this.getCorrectResponsesPattern(model)
      };

      return definition;
    },

    getCorrectResponsesPattern: function(model) {
      const correctAnswer = model.get('_correctAnswer');
      if (correctAnswer) return [correctAnswer];

      const correctRange = model.get('_correctRange');
      if (correctRange) {
        const bottom = correctRange._bottom || '';
        const top = correctRange._top || '';

        return [
          bottom + DELIMETER + top
        ];
      }
    }

  });

  return SliderStatementModel;

});
