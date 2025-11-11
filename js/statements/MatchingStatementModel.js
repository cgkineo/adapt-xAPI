import QuestionStatementModel from './QuestionStatementModel';

const ITEM_DELIMETER = '[,]';
const PAIR_DELIMETER = '[,]';

class MatchingStatementModel extends QuestionStatementModel {

  getResponse(model) {
    return model.getResponse().replace(/\.|,|#/g, match => {
      if (match === '.') return ITEM_DELIMETER;
      return PAIR_DELIMETER;
    });
  }
}

export default MatchingStatementModel;
