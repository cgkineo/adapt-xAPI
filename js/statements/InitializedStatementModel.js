import AbstractStatementModel from './AbstractStatementModel';

class InitializedStatementModel extends AbstractStatementModel {

  getVerb() {
    const verb = {
      id: 'http://adlnet.gov/expapi/verbs/initialized',
      display: {
        [this.get('recipeLang')]: 'initialized'
      }
    };

    return verb;
  }

  getActivityType() {
    return ADL.activityTypes.course;
  }

  getContextExtensions() {
    const extensions = super.getContextExtensions.apply(this, arguments);

    Object.assign(extensions, {
      'http://id.tincanapi.com/extension/browser-info': {
        'user-agent-header': navigator.userAgent.toString()
      }
    });

    return extensions;
  }

}

export default InitializedStatementModel;
