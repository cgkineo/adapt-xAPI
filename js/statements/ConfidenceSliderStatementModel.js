import QuestionStatementModel from './QuestionStatementModel';

class ConfidenceSliderStatementModel extends QuestionStatementModel {

  getResult(model) {
    const result = {
      completion: model.get('_isComplete'),
      response: this.getResponse(model)
    };

    return result;
  }

}

export default ConfidenceSliderStatementModel;
