import AbstractStatementModel from "./abstractStatementModel";

class InteractedStatementModel extends AbstractStatementModel {

  initialize(attributes, options) {
    this._type = null;
    this._type = options._type;

    AbstractStatementModel.prototype.initialize.apply(this, arguments);
  }

  getVerb(model) {
    const verb = {
      id: 'http://adlnet.gov/expapi/verbs/interacted',
      display: {}
    };

    verb.display[super.get('recipeLang')] = 'interacted';

    return verb;
  }

  getActivityType(model) {
    return ADL.activityTypes.interaction;
  }

  getContextExtensions(model) {
    const extensions = AbstractStatementModel.prototype.getContextExtensions.apply(this, arguments);

    _.extend(extensions, {
      'http://id.tincanapi.com/extension/condition-type': this._type
    });

    return extensions;
  }
}

export default InteractedStatementModel;
