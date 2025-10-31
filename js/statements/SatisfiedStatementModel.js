import AbstractStatementModel from './AbstractStatementModel';

class SatisfiedStatementModel extends AbstractStatementModel {

  getData(model) {
    const statement = AbstractStatementModel.prototype.getData.apply(this, arguments);

    statement.result = this.getResult(model);

    return statement;
  }

  getVerb(model) {
    const verb = {
      id: 'http://activitystrea.ms/schema/1.0/satisfy',
      display: {}
    };

    verb.display[this.get('recipeLang')] = 'satisfied';

    return verb;
  }

  getActivityType(model) {
    return ADL.activityTypes.course;
  }

  getResult(model) {
    const result = {
      duration: this.getISO8601Duration(model.get('_totalDuration'))
    };

    return result;
  }
}

export default SatisfiedStatementModel;
