import VideoStatementModel from './VideoStatementModel';

class VideoPausedStatementModel extends VideoStatementModel {

  getVerb(model) {
    const verb = {
      id: 'https://w3id.org/xapi/video/verbs/paused',
      display: {}
    };

    verb.display[this.get('recipeLang')] = 'paused';

    return verb;
  }

  getContextExtensions(model, state) {
    const extensions = VideoStatementModel.prototype.getContextExtensions.apply(this, arguments);

    _.extend(extensions, {
      'https://w3id.org/xapi/video/extensions/length': state.duration
    });

    return extensions;
  }

  getResultExtensions(state) {
    const extensions = VideoStatementModel.prototype.getResultExtensions.apply(this, arguments);

    _.extend(extensions, {
      'https://w3id.org/xapi/video/extensions/time': state.time,
      'https://w3id.org/xapi/video/extensions/progress': state.progress,
      'https://w3id.org/xapi/video/extensions/played-segments': state.playedSegments
    });

    return extensions;
  }
}

export default VideoPausedStatementModel;
