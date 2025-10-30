import AbstractStatementModel from './AbstractStatementModel';

class VideoStatementModel extends AbstractStatementModel {

  getData(model, state) {
    const statement = AbstractStatementModel.prototype.getData.apply(this, arguments);
    statement.result = this.getResult(state);

    return statement;
  }

  getVerb(model) {
    const verb = {
      id: 'https://w3id.org/xapi/video/verbs/played',
      display: {}
    };

    verb.display[this.get('recipeLang')] = 'played';

    return verb;
  }

  getActivityType(model) {
    return 'https://w3id.org/xapi/video/activity-type/video';
  }

  getContextActivities(model) {
    const contextActivities = AbstractStatementModel.prototype.getContextActivities.apply(this, arguments);

    contextActivities.category = [
      {
        id: 'https://w3id.org/xapi/video'
      }
    ];

    return contextActivities;
  }

  getContextExtensions(model, state) {
    const extensions = AbstractStatementModel.prototype.getContextExtensions.apply(this, arguments);

    Object.assign(extensions, {
      'https://w3id.org/xapi/video/extensions/session-id': state.sessionId,
      'http://id.tincanapi.com/extension/tags': model.get('_tags')
    });

    return extensions;
  }

  getResult(state) {
    const result = {
      extensions: this.getResultExtensions(state)
    };

    return result;
  }

  getResultExtensions(state) {
    const extensions = {
      'https://w3id.org/xapi/video/extensions/time': state.time
    };

    return extensions;
  }
}

export default VideoStatementModel;
