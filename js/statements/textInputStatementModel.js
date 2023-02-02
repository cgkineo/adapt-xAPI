define([
  './questionStatementModel'
], function(QuestionStatementModel) {

  const TextInputStatementModel = QuestionStatementModel.extend({

    getInteractionObject: function(model) {
      const correctResponsesPattern = this.getCorrectResponsesPattern(model);
      if (correctResponsesPattern === null) return {};

      const definition = {
        correctResponsesPattern
      };

      return definition;
    },

    getCorrectResponsesPattern: function(model) {
      let correctAnswers = model.get('_answers');

      // use same assumption as component that generic answers supersede specific answers
      if (!correctAnswers) {
        const items = model.get('_items');

        // Exclude correctResponsesPattern if using specific answers when there is more than one input?
        // 'Where the criteria for a question are complex and correct responses cannot be exhaustively listed, Learning Record Providers are discouraged from using the "correctResponsesPattern" property.'
        if (items > 1) return null;

        correctAnswers = _.pluck(items, '_answers');
      }

      return _.flatten(correctAnswers);
    }

  });

  return TextInputStatementModel;

});
