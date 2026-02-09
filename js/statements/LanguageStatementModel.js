import AbstractStatementModel from './AbstractStatementModel';

class LanguageStatementModel extends AbstractStatementModel {

  getData(model, lang) {
    const statement = super.getData.apply(this, arguments);
    statement.result = this.getResult(model, lang);
    return statement;
  }

  getActivityType() {
    return ADL.activityTypes.course;
  }

  getResult(model, lang) {
    const result = {
      response: lang
    };

    return result;
  }
}

export default LanguageStatementModel;
