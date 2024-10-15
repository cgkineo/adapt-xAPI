import AbstractStatementModel from './AbstractStatementModel';

class CompletedStatementModel extends AbstractStatementModel {

  getData(model) {
    const statement = super.getData.apply(this, arguments);

    const modelType = model.get('_type');
    if (modelType === 'course' || modelType === 'page') statement.result = this.getResult(model);

    return statement;
  }

  getVerb() {
    const verb = {
      id: 'http://adlnet.gov/expapi/verbs/completed',
      display: {
        [this.get('recipeLang')]: 'completed'
      }
    };

    return verb;
  }

  getActivityType(model) {
    const modelType = model.get('_type');

    switch (modelType) {
      case 'course':
        return ADL.activityTypes.course;
      case 'page':
        return ADL.activityTypes.module;
      case 'component':
        return ADL.activityTypes.interaction;
      default:
        return null;
    }
  }

  getResult(model) {
    const result = {
      duration: this.getISO8601Duration(model.get('_totalDuration'))
    };

    return result;
  }

}

export default CompletedStatementModel;
