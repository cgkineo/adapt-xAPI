import VideoStatementModel from './VideoStatementModel';

class VideoCompletedStatementModel extends VideoStatementModel {

  initialize(attributes, options) {
    this._type = options._type;
    this._totalVideos = options._totalVideos;
    this._completedVideos = options._completedVideos;

    VideoStatementModel.prototype.initialize.apply(this, arguments);
  }

  getVerb(model) {
    const verb = {
      id: 'https://w3id.org/xapi/video/verbs/completed',
      display: {}
    };

    verb.display[this.get('recipeLang')] = 'completed';

    return verb;
  }

  getContextExtensions(model, state) {
    const extensions = VideoStatementModel.prototype.getContextExtensions.apply(this, arguments);

    switch (this._type) {
      case 'watch':
        Object.assign(extensions, {
          'https://w3id.org/xapi/video/extensions/length': state.duration,
          'http://id.tincanapi.com/extension/condition-type': 'watch'
        });
        break;
      case 'transcript':
        Object.assign(extensions, {
          'https://w3id.org/xapi/video/extensions/length': state.duration,
          'http://id.tincanapi.com/extension/condition-type': 'transcript'
        });
        break;
    }

    Object.assign(extensions, {
      'http://id.tincanapi.com/extension/measurement': {
        'Total Videos': this._totalVideos,
        'Completed Videos': this._completedVideos
      }
    });

    return extensions;
  }

  getResult(state) {
    const result = VideoStatementModel.prototype.getResult.apply(this, arguments);

    switch (this._type) {
      case 'watch':
        Object.assign(result, {
          duration: this.getISO8601Duration(state.playbackDuration * 1000),
          completion: true
        });
        break;
      case 'transcript':
        Object.assign(result, {
          duration: this.getISO8601Duration(state.playbackDuration * 1000),
          completion: true
        });
        break;
    }

    return result;
  }

  getResultExtensions(state) {
    const extensions = VideoStatementModel.prototype.getResultExtensions.apply(this, arguments);

    Object.assign(extensions, {
      'https://w3id.org/xapi/video/extensions/time': state.time,
      'https://w3id.org/xapi/video/extensions/progress': state.progress,
      'https://w3id.org/xapi/video/extensions/played-segments': state.playedSegments
    });

    return extensions;
  }

}

export default VideoCompletedStatementModel;
