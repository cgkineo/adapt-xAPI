import AbstractStatementModel from './abstractStatementModel';

class PreferredStatementModel extends AbstractStatementModel {

  getVerb(model) {
    const verb = {
      id: 'http://adlnet.gov/expapi/verbs/preferred',
      display: {}
    };

    verb.display[this.get('recipeLang')] = 'preferred';

    return verb;
  }
}

export default PreferredStatementModel;
