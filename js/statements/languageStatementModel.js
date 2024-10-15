import PreferredStatementModel from './PreferredStatementModel';

class LanguageStatementModel extends PreferredStatementModel {

  getData(model, lang) {
    const statement = super.getData.apply(this, arguments);

    statement.result = this.getResult(model, lang);

    return statement;
  }

  getActivityType(model) {
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
