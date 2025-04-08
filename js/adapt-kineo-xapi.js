import Adapt from 'core/js/adapt';
import wait from 'core/js/wait';
import offlineStorage from 'core/js/offlineStorage';
import OfflineStorageHandler from './OfflineStorageHandler';
import ErrorNotificationModel from './ErrorNotificationModel';
import LaunchModel from './LaunchModel';
import StatementModel from './StatementModel';
import StateModel from './StateModel';
import 'libraries/xapiwrapper.min';

class XAPI extends Backbone.Controller {

  defaults() {
    return {
      _isInitialized: false,
      _config: null,
      _activityId: null,
      _restoredLanguage: null,
      errorNotificationModel: null,
      launchModel: null,
      statementModel: null,
      stateModel: null
    };
  }

  initialize() {
    this.listenToOnce(Adapt, 'offlineStorage:prepare', this.onPrepareOfflineStorage);
  }

  initializeErrorNotification() {
    const { _errors: config } = this._config;

    this.errorNotificationModel = new ErrorNotificationModel(config);
  }

  initializeLaunch() {
    this.listenToOnce(Adapt, {
      'xapi:launchInitialized': this.onLaunchInitialized,
      'xapi:launchFailed': this.onLaunchFailed
    });

    this.launchModel = new LaunchModel();
  }

  initializeState() {
    this.listenTo(Adapt, 'xapi:stateLoaded', this.onStateLoaded);

    const config = {
      activityId: this.getActivityId(),
      registration: this.launchModel.get('registration'),
      actor: this.launchModel.get('actor')
    };

    this.stateModel = new StateModel(config, {
      wrapper: this.launchModel.getWrapper(),
      _tracking: this._config._tracking
    });
  }

  initializeStatement() {
    const AdaptPlugins = Adapt.build.get('plugins');
    const xAPIPlugin = AdaptPlugins.find(plugin => plugin.name === 'adapt-xAPI');
    const xAPIVersion = xAPIPlugin ? xAPIPlugin.version : null;

    const config = {
      activityId: this.getActivityId(),
      registration: this.launchModel.get('registration'),
      revision: this._config._revision || xAPIVersion || null,
      contentRelease: this._config._contentRelease || null,
      actor: this.launchModel.get('actor'),
      contextActivities: this.launchModel.get('contextActivities')
    };

    this.statementModel = new StatementModel(config, {
      wrapper: this.launchModel.getWrapper(),
      _tracking: this._config._tracking
    });
  }

  getActivityId() {
    if (this._activityId) return this._activityId;

    const lrs = this.launchModel.getWrapper().lrs;
    // if using cmi5 the activityId MUST come from the query string for "cmi.defined" statements
    let activityId = lrs.activityId || lrs.activity_id || this._config._activityId;

    // @todo: should activityId be derived from URL? Would suggest not as the domain may not be controlled by the author/vendor
    if (!activityId) Adapt.trigger('xapi:activityIdError');

    // remove trailing slash if included
    activityId = activityId.replace(/\/?$/, '');

    return activityId;
  }

  // @todo: offlineStorage conflict with adapt-contrib-spoor
  onPrepareOfflineStorage() {
    this._config = Adapt.config.get('_xapi');

    if (this._config?._isEnabled) {
      wait.begin();

      offlineStorage.initialize(OfflineStorageHandler);

      this.initializeErrorNotification();
      this.initializeLaunch();
    }
  }

  onLaunchInitialized() {
    this._activityId = this.getActivityId();

    if (!this._activityId) {
      this.onLaunchFailed();

      return;
    }

    this.listenToOnce(Adapt, {
      'offlineStorage:ready': this.onOfflineStorageReady,
      'app:dataLoaded': this.onDataLoaded,
      'adapt:initialize': this.onAdaptInitialize
    });

    this.listenTo(Adapt, {
      'app:languageChanged': this.onLanguageChanged
    });

    this.initializeState();
    this.initializeStatement();
  }

  onLaunchFailed() {
    wait.end();

    offlineStorage.setReadyStatus();
  }

  onOfflineStorageReady() {
    this._restoredLanguage = offlineStorage.get('lang');
  }

  onLanguageChanged(newLanguage, previousLanguage) {
    const languageConfig = Adapt.config.get('_languagePicker');

    if (languageConfig?._isEnabled && this._restoredLanguage !== newLanguage && newLanguage !== previousLanguage) {
      // only reset if language has changed since the course was started - not neccessary before
      const resetState = this._isInitialized && !languageConfig._restoreStateOnLanguageChange;
      // @todo: only send when via a user selection? If `"_showOnCourseLoad": false`, this will still be triggered
      Adapt.trigger('xapi:languageChanged', newLanguage, resetState);
    }

    this._restoredLanguage = null;
  }

  onStateLoaded() {
    wait.end();
    offlineStorage.setReadyStatus();
  }

  onDataLoaded() {
    const globals = Adapt.course.get('_globals');
    if (!globals._learnerInfo) globals._learnerInfo = {};
    globals._learnerInfo = offlineStorage.get('learnerinfo');
  }

  onAdaptInitialize() {
    this._isInitialized = true;
  }

}

Adapt.xapi = new XAPI();

export default Adapt.xapi;
