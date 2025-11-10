import AbstractStatementModel from './AbstractStatementModel';

class ReleasedStatementModel extends AbstractStatementModel {

  initialize(attributes, options) {
    this._name = options._name;
    this._length = options._length;
    this._reason = options._reason;

    AbstractStatementModel.prototype.initialize.apply(this, arguments);
  }

  getVerb(model) {

    const verb = {
      id: 'http://future-learning.info/xAPI/verb/released',
      display: {}
    };

    verb.display[this.get('recipeLang')] = 'released';

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

  getContextExtensions(model) {
    const extensions = AbstractStatementModel.prototype.getContextExtensions.apply(this, arguments);

    Object.assign(extensions, {
      'https://adaptlearning.org/xapi/extension/length': this._length,
      'https://adaptlearning.org/xapi/extension/reason': this._reason
    });

    return extensions;
  }
}

export default ReleasedStatementModel;
