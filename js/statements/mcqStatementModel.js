import QuestionStatementModel from './questionStatementModel';

const DELIMETER = '[,]';

class McqStatementModel extends QuestionStatementModel {

  getResponse(model) {
    return model.getResponse().replace(/,|#/g, DELIMETER);
  }
  
}

export default McqStatementModel;
