import AbstractStatementModel from './AbstractStatementModel';

class ExperiencedStatementModel extends AbstractStatementModel {

  getData(model) {
    const statement = super.getData.apply(this, arguments);
    statement.result = this.getResult(model);

    return statement;
  }

  getVerb() {
    const verb = {
      id: 'http://adlnet.gov/expapi/verbs/experienced',
      display: {
        [this.get('recipeLang')]: 'experienced'
      }
    };

    return verb;
  }

  getActivityType() {
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
