import AbstractStatementModel from './AbstractStatementModel';

class ViewedStatementModel extends AbstractStatementModel {

  getVerb(model) {
    const verb = {
      id: 'http://id.tincanapi.com/verb/viewed',
      display: {}
    };

    verb.display[this.get('recipeLang')] = 'viewed';

    return verb;
  }

  getActivityType(model) {
    return 'http://id.tincanapi.com/activitytype/vocabulary-word';
  }

  getName(model) {
    const name = {};
    name[this.get('lang')] = model.get('term');

    return name;
  }

  getDescription(model) {
    const description = {};
    description[this.get('lang')] = model.get('description');

    return description;
  }

  getContextExtensions(model) {
    const extensions = AbstractStatementModel.prototype.getContextExtensions.apply(this, arguments);

    return Object.assign(extensions, {
      'http://id.tincanapi.com/extension/tags': {
        term: model.get('term'),
        description: model.get('description')
      }
    });
  }

  getUniqueIri(model) {
    let iri = this.get('activityId');

    if (model && model.get('_type') !== 'course') {
      iri += '/glossary';
    }

    return iri;
  }
}

export default ViewedStatementModel;
