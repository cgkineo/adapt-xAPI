import AbstractStatementModel from './AbstractStatementModel';

class DeniedStatementModel extends AbstractStatementModel {

  initialize(attributes, options) {
    this._name = options._name;
    this._type = options._type;

    AbstractStatementModel.prototype.initialize.apply(this, arguments);
  }

  getVerb(model) {

    const verb = {
      id: 'http://activitystrea.ms/schema/1.0/deny',
      display: {}
    };

    verb.display[this.get('recipeLang')] = 'denied';

    return verb;
  }

  getActivityType(model) {
    return ADL.activityTypes.collection;
  }

  getName(model) {
    const name = {};
    name[this.get('lang')] = this._name;

    return name;
  }

  getContextExtensions(model) {
    const extensions = AbstractStatementModel.prototype.getContextExtensions.apply(this, arguments);

    _.extend(extensions, {
      'https://adaptlearning.org/xapi/extension/reason': this._type
    });

    return extensions;
  }

}

export default DeniedStatementModel;
