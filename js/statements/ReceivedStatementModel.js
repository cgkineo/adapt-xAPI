import AbstractStatementModel from './AbstractStatementModel';

class ReceivedStatementModel extends AbstractStatementModel {

  initialize(attributes, options) {
    this._type = options._type;

    AbstractStatementModel.prototype.initialize.apply(this, arguments);
  }

  getVerb(model) {

    const verb = {
      id: 'http://activitystrea.ms/schema/1.0/receive',
      display: {}
    };

    verb.display[this.get('recipeLang')] = 'received';

    return verb;
  }

  getActivityType(model) {
    return ADL.activityTypes.course;
  }

  getName(model) {
    const name = {};
    name[this.get('lang')] = this._type;

    return name;
  }

  getContextExtensions(model) {
    const extensions = AbstractStatementModel.prototype.getContextExtensions.apply(this, arguments);

    Object.assign(extensions, {
      'http://id.tincanapi.com/extension/condition-type': this._type
    });

    return extensions;
  }
}

export default ReceivedStatementModel;
