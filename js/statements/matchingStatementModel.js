import QuestionStatementModel from './questionStatementModel';

const ITEM_DELIMETER = '[,]';
const PAIR_DELIMETER = '[,]';

class MatchingStatementModel extends QuestionStatementModel {

  getResponse(model) {
    return model.getResponse().replace(/\./g, ITEM_DELIMETER).replace(/,|#/g, PAIR_DELIMETER);
  }
  
}

export default MatchingStatementModel;
