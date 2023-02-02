define([
  './questionStatementModel'
], function(QuestionStatementModel) {

  const DELIMETER = '[,]';

  const McqStatementModel = QuestionStatementModel.extend({

    /*
        getInteractionObject: function(model) {
            var interactionObject = model.getInteractionObject();

            var definition = {
                choices: this.getChoices(interactionObject.choices),
                correctResponsesPattern: interactionObject.correctResponsesPattern
            };

            return definition;
        },

        getChoices: function(choices) {
            choices.forEach(function(choice) {
                var description = {};
                description[this.get('lang')] = choice.description;
                choice.description = description;
            }, this);

            return choices;
        },
        */

    getResponse: function(model) {
      return model.getResponse().replace(/,|#/g, DELIMETER);
    }

  });

  return McqStatementModel;

});
