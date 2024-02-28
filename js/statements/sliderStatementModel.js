import QuestionStatementModel from './questionStatementModel';

class SliderStatementModel extends QuestionStatementModel {

  defaults() {
    return {
      DELIMETER: '[:]'
    }
  }

  getInteractionObject(model) {
    const definition = {
      correctResponsesPattern: this.getCorrectResponsesPattern(model)
    };

    return definition;
  }

  getCorrectResponsesPattern(model) {
    const correctAnswer = model.get('_correctAnswer');
    if (correctAnswer) return [correctAnswer];

    const correctRange = model.get('_correctRange');
    if (correctRange) {
      const bottom = correctRange._bottom || '';
      const top = correctRange._top || '';

      return [
        bottom + this.DELIMETER + top
      ];
    }
  }
  
}

export default SliderStatementModel;
