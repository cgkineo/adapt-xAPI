import Adapt from "core/js/adapt";
import wait from "core/js/wait";

const LAUNCH_ERROR_ID = 'launch-error';
const ACTIVITYID_ERROR_ID = 'activityId-error';
const LRS_ERROR_ID = 'lrs-error';

class ErrorNotificationModel extends Backbone.Model {

  defaults() {
    return {
      _isReady: false,
      _isNotifyOpen: false,
      _isDeferredLoadingError: false,
      _currentNotifyId: null
    };
  }

  initialize() {
    this.listenToOnce(Adapt, {
      'app:dataLoaded': this.onDataLoaded
    });

    this.listenTo(Adapt, {
      'xapi:launchError': this.onShowLaunchError,
      'xapi:activityIdError': this.onShowActivityIdError,
      'xapi:lrsError': this.onShowLRSError,
      'notify:closed': this.onNotifyClosed
    });
  }

  _showNotification(config, id) {
    if (this._isReady) {
      if (!this._isNotifyOpen) {
        Adapt.log.error(config.title);

        const notifyConfig = this._getNotifyConfig(config, id);

        Adapt.trigger('notify:popup', notifyConfig);

        this._isNotifyOpen = true;
        this._currentNotifyId = id;

      } else if (this._currentNotifyId !== id) {
        this.listenToOnce(Adapt, 'notify:closed', this._showNotification.bind(this, config, id));
      }
    } else {
      this._isDeferredLoadingError = true;

      this.listenToOnce(Adapt, 'app:dataLoaded', this._showNotification.bind(this, config, id));
    }
  }

  _getNotifyConfig(config, id) {
    const notifyConfig = {
      title: config.title,
      body: config.body,
      _classes: 'xAPIError ' + id + ' ' + config._classes,
      _isxAPIError: true
    };

    let isCancellable = true;

    if (config.hasOwnProperty('_isCancellable')) {
      isCancellable = config._isCancellable;
      notifyConfig._isCancellable = isCancellable;
      notifyConfig._closeOnShadowClick = !isCancellable;
    }

    return notifyConfig;
  }

  /**
   * Can't show notify until data has loaded due to `import_globals` in template
   */
  onDataLoaded() {
    this._isReady = true;

    if (this._isDeferredLoadingError) {
      wait.begin();

      $('.loading').hide();
    }
  }

  onShowLaunchError() {
    this._showNotification(this.get('_launch'), LAUNCH_ERROR_ID);
  }

  onShowActivityIdError() {
    this._showNotification(this.get('_activityId'), ACTIVITYID_ERROR_ID);
  }

  onShowLRSError() {
    this._showNotification(this.get('_lrs'), LRS_ERROR_ID);
  }

  onNotifyClosed(notify) {
    if (!notify.model.get('_isxAPIError')) return;

    if (this._isDeferredLoadingError) {
      wait.end();

      this._isDeferredLoadingError = false;

      // cancel other errors if launch failed and user dismissed, as it won't track regardless
      this.stopListening();
    }

    this._isNotifyOpen = false;
    this._currentNotifyId = null;
  }

}

export default ErrorNotificationModel;
