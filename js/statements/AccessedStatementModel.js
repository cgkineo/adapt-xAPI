import AbstractStatementModel from './AbstractStatementModel';

class AccessedStatementModel extends AbstractStatementModel {

  getVerb(model) {

    const verb = {
      id: 'https://activitystrea.ms/schema/1.0/access',
      display: {}
    };

    verb.display[this.get('recipeLang')] = 'accessed';

    return verb;
  }

  getActivityType(model) {
    return 'http://id.tincanapi.com/activitytype/resource';
  }

  getName(model) {
    const name = {};
    name[this.get('lang')] = model.get('title');

    return name;
  }

  getDescription(model) {
    const description = {};
    description[this.get('lang')] = model.get('description');

    return description;
  }

  getContentObjectsContextActivities(model) {
    return 'course';
  }

  getContextExtensions(model) {
    const extensions = AbstractStatementModel.prototype.getContextExtensions.apply(this, arguments);

    Object.assign(extensions, {
      'http://id.tincanapi.com/extension/location': model.get('location'),
      'http://id.tincanapi.com/extension/tags': {
        title: model.get('title'),
        type: model.get('type'),
        link: model.get('url')
      }
    });

    return extensions;
  }

  getUniqueIri(model) {
    let iri = this.get('activityId');

    if (model && model.get('_type') !== 'course') {
      iri += '/resources';
    }

    return iri;
  }

}

export default AccessedStatementModel;
