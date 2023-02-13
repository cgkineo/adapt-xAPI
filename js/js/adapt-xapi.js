define([
  'core/js/adapt',
  './offlineStorage',
  './errorNotificationModel',
  './launchModel',
  './statementModel',
  './stateModel',
  'libraries/xapiwrapper.min',
  'libraries/url-polyfill',
  'libraries/fetch-polyfill',
  'libraries/promise-polyfill.min'
], function(Adapt, OfflineStorage, ErrorNotificationModel, LaunchModel, StatementModel, StateModel) {

  const xAPI = Backbone.Controller.extend({

    _isInitialized: false,
    _config: null,
    _activityId: null,
    _restoredLanguage: null,
    _currentLanguage: null,
    errorNotificationModel: null,
    launchModel: null,
    statementModel: null,
    stateModel: null,

    initialize: function() {
      this.listenToOnce(Adapt, 'offlineStorage:prepare', this.onPrepareOfflineStorage);
    },

    initializeErrorNotification: function() {
      const config = this._config._errors;

      this.errorNotificationModel = new ErrorNotificationModel(config);
    },

    initializeLaunch: function() {
      this.listenToOnce(Adapt, {
        'xapi:launchInitialized': this.onLaunchInitialized,
        'xapi:launchFailed': this.onLaunchFailed
      });

      this.launchModel = new LaunchModel();
    },

    initializeState: function() {
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
    },

    initializeStatement: function() {
      const config = {
        activityId: this.getActivityId(),
        registration: this.launchModel.get('registration'),
        revision: this._config._revision || null,
        actor: this.launchModel.get('actor'),
        contextActivities: this.launchModel.get('contextActivities')
      };

      this.statementModel = new StatementModel(config, {
        wrapper: this.launchModel.getWrapper(),
        _tracking: this._config._tracking
      });
    },

    getActivityId: function() {
      if (this._activityId) return this._activityId;

      const lrs = this.launchModel.getWrapper().lrs;
      // if using cmi5 the activityId MUST come from the query string for "cmi.defined" statements
      let activityId = lrs.activityId || lrs.activity_id || this._config._activityId;

      // @todo: should activityId be derived from URL? Would suggest not as the domain may not be controlled by the author/vendor
      if (!activityId) Adapt.trigger('xapi:activityIdError');

      // remove trailing slash if included
      activityId = activityId.replace(/\/?$/, '');

      return activityId;
    },

    // @todo: offlineStorage conflict with adapt-contrib-spoor
    onPrepareOfflineStorage: function() {
      this._config = Adapt.config.get('_xapi');

      if (this._config && this._config._isEnabled) {
        Adapt.wait.begin();

        Adapt.offlineStorage.initialize(OfflineStorage);

        this.initializeErrorNotification();
        this.initializeLaunch();
      }
    },

    onLaunchInitialized: function() {
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
    },

    onLaunchFailed: function() {
      Adapt.wait.end();

      Adapt.offlineStorage.setReadyStatus();
    },

    onOfflineStorageReady: function() {
      this._restoredLanguage = Adapt.offlineStorage.get('lang');
    },

    onLanguageChanged: function(lang) {
      const languageConfig = Adapt.config.get('_languagePicker');

      if (languageConfig && languageConfig._isEnabled && this._restoredLanguage !== lang && this._currentLanguage !== lang) {
        // only reset if language has changed since the course was started - not neccessary before
        const resetState = this._isInitialized && !languageConfig._restoreStateOnLanguageChange;

        // @todo: only send when via a user selection? If `"_showOnCourseLoad": false`, this will still be triggered
        Adapt.trigger('xapi:languageChanged', lang, resetState);
      }

      this._restoredLanguage = null;
      this._currentLanguage = lang;
    },

    onStateLoaded: function() {
      Adapt.wait.end();

      Adapt.offlineStorage.setReadyStatus();
    },

    onDataLoaded: function() {
      const globals = Adapt.course.get('_globals');
      if (!globals._learnerInfo) globals._learnerInfo = {};
      globals._learnerInfo = Adapt.offlineStorage.get('learnerinfo');
    },

    onAdaptInitialize: function() {
      this._isInitialized = true;
    }

  });

  return new xAPI();

});
