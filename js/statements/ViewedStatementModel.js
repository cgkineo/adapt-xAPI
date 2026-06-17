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
    return 'http://id.tincanapi.com/activitytype/glossary-term';
  }

  getName(model) {
    const name = {};
    name[this.get('lang')] = model.get('term');

    return name;
  }

  getContentObjectsContextActivities(model) {
    return [];
  }

  getContextExtensions(model) {
    const extensions = AbstractStatementModel.prototype.getContextExtensions.apply(this, arguments);

    Object.assign(extensions, {
      'http://id.tincanapi.com/extension/glossary-term': model.get('term'),
      'http://id.tincanapi.com/extension/glossary-definition': model.get('description')
    });

    return extensions;
  }

  getUniqueIri(model) {
    return this.get('activityId') + '/glossary';
  }

}

export default ViewedStatementModel;
