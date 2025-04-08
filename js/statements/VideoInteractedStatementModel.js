import VideoStatementModel from './VideoStatementModel';

class VideoInteractedStatementModel extends VideoStatementModel {

  defaults() {
    return {
      _type: null
    };
  }

  initialize(attributes, options) {
    this._type = options._type;

    VideoStatementModel.prototype.initialize.apply(this, arguments);
  }

  getVerb(model) {
    const verb = {
      id: 'https://w3id.org/xapi/video/verbs/interacted',
      display: {}
    };

    verb.display[this.get('recipeLang')] = 'interacted';

    return verb;
  }

  getContextExtensions(model, state) {
    const extensions = VideoStatementModel.prototype.getContextExtensions.apply(this, arguments);
    const audio = {
      mute: state.muted,
      volume: state.volume
    };

    switch (this._type) {
      case 'rate':
        _.extend(extensions, {
          'https://w3id.org/xapi/video/extensions/speed': state.speed
        });
        break;
      case 'captions':
        _.extend(extensions, {
          'https://w3id.org/xapi/video/extensions/cc-subtitle-enabled': state.isEnabled,
          'https://w3id.org/xapi/video/extensions/cc-subtitle-lang': state.lang
        });
        break;
      case 'volume':
        _.extend(extensions, {
          'https://w3id.org/xapi/video/extensions/volume': audio
        });
        break;
      case 'transcript':
        _.extend(extensions, {
          'http://id.tincanapi.com/extension/condition-type': this._type,
          'http://id.tincanapi.com/extension/condition-value': state.state
        });
        break;
    }

    return extensions;
  }

  getResultExtensions(state) {
    const extensions = VideoStatementModel.prototype.getResultExtensions.apply(this, arguments);

    _.extend(extensions, {
      'https://w3id.org/xapi/video/extensions/time': state.time
    });

    return extensions;
  }
}

export default VideoInteractedStatementModel;
