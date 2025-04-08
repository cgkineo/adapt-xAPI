import VideoStatementModel from './VideoStatementModel';

class VideoPlayedStatementModel extends VideoStatementModel {

  getVerb(model) {
    const verb = {
      id: 'https://w3id.org/xapi/video/verbs/played',
      display: {}
    };

    verb.display[this.get('recipeLang')] = 'played';

    return verb;
  }

  getResultExtensions(state) {
    const extensions = VideoStatementModel.prototype.getResultExtensions.apply(this, arguments);

    _.extend(extensions, {
      'https://w3id.org/xapi/video/extensions/time': state.time
    });

    return extensions;
  }
}

export default VideoPlayedStatementModel;
