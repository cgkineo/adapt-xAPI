import AbstractStatementModel from './AbstractStatementModel';

class FocusedStatementModel extends AbstractStatementModel {

  getVerb(model) {
    const verb = {
      id: 'http://id.tincanapi.com/verb/focused',
      display: {}
    };

    verb.display[this.get('recipeLang')] = 'focused';

    return verb;
  }

  getActivityType(model) {
    return ADL.activityTypes.module;
  }
}

export default FocusedStatementModel;
