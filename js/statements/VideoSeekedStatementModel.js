import VideoStatementModel from './VideoStatementModel';

class VideoSeekedStatementModel extends VideoStatementModel {

  getVerb(model) {
    const verb = {
      id: 'https://w3id.org/xapi/video/verbs/seeked',
      display: {}
    };

    verb.display[this.get('recipeLang')] = 'seeked';

    return verb;
  }

  getResultExtensions(state) {
    const extensions = VideoStatementModel.prototype.getResultExtensions.apply(this, arguments);

    Object.assign(extensions, {
      'https://w3id.org/xapi/video/extensions/time-from': state.start,
      'https://w3id.org/xapi/video/extensions/time-to': state.end
    });

    return extensions;
  }
}

export default VideoSeekedStatementModel;
