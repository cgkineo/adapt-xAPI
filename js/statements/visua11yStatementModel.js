import AbstractStatementModel from './abstractStatementModel';
import PreferredStatementModel from './preferredStatementModel';

class Visua11yStatementModel extends PreferredStatementModel {

  initialize(attributes, options) {
    this._type = null;
    this._name = options._name;
    this._state = options._state;

    AbstractStatementModel.prototype.initialize.apply(this, arguments);
  }

  getActivityType(model) {
    return ADL.activityTypes.interaction;
  }

  getName(model) {
    const name = {};
    name[this.get('lang')] = this._name;

    return name;
  }

  getContextExtensions(model) {
    const extensions = AbstractStatementModel.prototype.getContextExtensions.apply(this, arguments);

    _.extend(extensions, {
      'http://id.tincanapi.com/extension/condition-type': this._name,
      'http://id.tincanapi.com/extension/condition-value': this._state
    });

    return extensions;
  }

  getUniqueIri(model) {
    let iri = this.get('activityId');

    if (model && model.get('_type') !== 'course') {
      iri += '/visua11y';
    }

    return iri;
  }
}

export default Visua11yStatementModel;
