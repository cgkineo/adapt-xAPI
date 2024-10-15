import AbstractStatementModel from './abstractStatementModel';

class ExperiencedStatementModel extends AbstractStatementModel {

  getData(model) {
    const statement = super.getData.apply(this, arguments);
    statement.result = this.getResult(model);

    return statement;
  }

  getVerb(model) {
    const verb = {
      id: 'http://adlnet.gov/expapi/verbs/experienced',
      display: {}
    };

    verb.display[this.get('recipeLang')] = 'experienced';

    return verb;
  }

  getActivityType(model) {
    return ADL.activityTypes.module;
  }

  getResult(model) {
    const result = {
      duration: this.getISO8601Duration(model.get('_sessionDuration'))
    };

    return result;
  }
}

export default ExperiencedStatementModel;
