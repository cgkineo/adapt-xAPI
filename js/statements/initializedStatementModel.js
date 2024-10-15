import AbstractStatementModel from './abstractStatementModel';

class InitializedStatementModel extends AbstractStatementModel {

  getVerb(model) {
    const verb = {
      id: 'http://adlnet.gov/expapi/verbs/initialized',
      display: {}
    };

    verb.display[this.get('recipeLang')] = 'initialized';

    return verb;
  }

  getActivityType(model) {
    return ADL.activityTypes.course;
  }

  getContextExtensions(model, state) {
    const extensions = super.getContextExtensions.apply(this, arguments);

    _.extend(extensions, {
      'http://id.tincanapi.com/extension/browser-info': {
        'user-agent-header': navigator.userAgent.toString()
      }
    });

    return extensions;
  }

}

export default InitializedStatementModel;
