import AbstractStatementModel from './AbstractStatementModel';

class TerminatedStatementModel extends AbstractStatementModel {

  defaults() {
    return {
      _sessionCounter: null,
      _totalVideos: null,
      _completedVideos: null
    };
  }

  initialize(attributes, options) {
    this._sessionCounter = options._sessionCounter;
    this._totalVideos = options._totalVideos;
    this._completedVideos = options._completedVideos;

    AbstractStatementModel.prototype.initialize.apply(this, arguments);
  }

  getData(model) {
    const statement = super.getData.apply(this, arguments);
    statement.result = this.getResult(model);

    return statement;
  }

  getVerb() {
    const verb = {
      id: 'http://adlnet.gov/expapi/verbs/terminated',
      display: {
        [this.get('recipeLang')]: 'terminated'
      }
    };

    return verb;
  }

  getActivityType() {
    return ADL.activityTypes.course;
  }

  getContextExtensions(model) {
    const extensions = AbstractStatementModel.prototype.getContextExtensions.apply(this, arguments);

    Object.assign(extensions, {
      'http://id.tincanapi.com/extension/measurement': {
        'Session Statements': this._sessionCounter + 1,
        'Total Videos': this._totalVideos,
        'Completed Videos': this._completedVideos
      }
    });

    return extensions;
  }

  getResult(model) {
    const sessionCounter = model.get('_sessionCounter');

    const result = {
      duration: this.getISO8601Duration(model.get('_sessionDuration')),
      sessionStatements: sessionCounter + 1
    };

    return result;
  }

}

export default TerminatedStatementModel;
