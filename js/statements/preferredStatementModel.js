import AbstractStatementModel from './AbstractStatementModel';

class PreferredStatementModel extends AbstractStatementModel {

  getVerb() {
    const verb = {
      id: 'http://adlnet.gov/expapi/verbs/preferred',
      display: {
        [this.get('recipeLang')]: 'preferred'
      }
    };

    return verb;
  }
}

export default PreferredStatementModel;
