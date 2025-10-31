import AbstractStatementModel from './AbstractStatementModel';

class AcknowledgedStatementModel extends AbstractStatementModel {

  getVerb() {

    const verb = {
      id: 'http://activitystrea.ms/schema/1.0/acknowledge',
      display: {}
    };

    verb.display[this.get('recipeLang')] = 'acknowledged';

    return verb;
  }

  getActivityType() {
    return 'http://activitystrea.ms/schema/1.0/question';
  }

}

export default AcknowledgedStatementModel;
