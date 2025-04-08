import AbstractStatementModel from './AbstractStatementModel';

class CompletedStatementModel extends AbstractStatementModel {

  defaults() {
    return {
      _type: null,
      _sessionCounter: null,
      _totalVideos: null,
      _completedVideos: null
    };
  }

  initialize(attributes, options) {
    this._type = options._type;
    this._sessionCounter = options._sessionCounter;
    this._totalVideos = options._totalVideos;
    this._completedVideos = options._completedVideos;

    AbstractStatementModel.prototype.initialize.apply(this, arguments);
  }

  getData(model) {
    const statement = super.getData.apply(this, arguments);

    const modelType = model.get('_type');
    if (modelType === 'course' || modelType === 'page') statement.result = this.getResult(model);

    return statement;
  }

  getVerb() {
    const verb = {
      id: 'http://adlnet.gov/expapi/verbs/completed',
      display: {
        [this.get('recipeLang')]: 'completed'
      }
    };

    return verb;
  }

  getActivityType(model) {
    const modelType = model.get('_type');

    switch (modelType) {
      case 'course':
        return ADL.activityTypes.course;
      case 'page':
        return ADL.activityTypes.module;
      case 'component':
        return ADL.activityTypes.interaction;
      default:
        return null;
    }
  }

  getContextExtensions(model) {
    const extensions = AbstractStatementModel.prototype.getContextExtensions.apply(this, arguments);

    _.extend(extensions, {
      'http://id.tincanapi.com/extension/measurement': {
        'Session Statements': this._sessionCounter + 1,
        'Total Videos': this._totalVideos,
        'Completed Videos': this._completedVideos
      }
    });

    return extensions;
  }

  getResult(model) {
    const result = {
      duration: this.getISO8601Duration(model.get('_totalDuration'))
    };

    return result;
  }

}

export default CompletedStatementModel;
