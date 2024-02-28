import QuestionStatementModel from './questionStatementModel';

class McqStatementModel extends QuestionStatementModel {

  /*
    getInteractionObject(model) {
      var interactionObject = model.getInteractionObject();

      var definition = {
        choices: this.getChoices(interactionObject.choices),
        correctResponsesPattern: interactionObject.correctResponsesPattern
      };

      return definition;
    }

    getChoices(choices) {
      choices.forEach(function(choice) {
        var description = {};
        description[this.get('lang')] = choice.description;
        choice.description = description;
      }, this);

      return choices;
    }
  */

  getResponse(model) {
    return model.getResponse().replace(/,|#/g, DELIMETER);
  }
  
}

export default McqStatementModel;
