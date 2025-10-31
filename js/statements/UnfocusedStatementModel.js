import AbstractStatementModel from './AbstractStatementModel';

class UnfocusedStatementModel extends AbstractStatementModel {

  getVerb(model) {
    const verb = {
      id: 'http://id.tincanapi.com/verb/unfocused',
      display: {}
    };

    verb.display[this.get('recipeLang')] = 'unfocused';

    return verb;
  }

  getActivityType(model) {
    return ADL.activityTypes.module;
  }
}

export default UnfocusedStatementModel;
