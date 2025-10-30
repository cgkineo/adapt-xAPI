import AbstractStatementModel from './AbstractStatementModel';

class CreatedStatementModel extends AbstractStatementModel {

  initialize(attributes, options) {
    this._name = options._name;

    AbstractStatementModel.prototype.initialize.apply(this, arguments);
  }

  getVerb(model) {

    const verb = {
      id: 'http://activitystrea.ms/schema/1.0/create',
      display: {}
    };

    verb.display[this.get('recipeLang')] = 'created';

    return verb;
  }

  getActivityType(model) {
    return ADL.activityTypes.event;
  }

  getName(model) {
    const name = {};
    name[this.get('lang')] = this._name || 'Statement Queue';

    return name;
  }
}

export default CreatedStatementModel;
