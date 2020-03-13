define([
    'core/js/adapt',
    './offlineStorage',
    './errorNotificationModel',
    './launchModel',
    './statementModel',
    './stateModel',
    'libraries/url',
    'libraries/xapiwrapper.min'
], function(Adapt, OfflineStorage, ErrorNotificationModel, LaunchModel, StatementModel, StateModel) {

    var xAPI = Backbone.Controller.extend({

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
            var config = this._config._errors;

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

            var config = {
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
            var config = {
                activityId: this.getActivityId(),
                //registration: this.launchModel.get('registration'),
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

            var lrs = this.launchModel.getWrapper().lrs;
            // @todo: if using cmi5 the activityId MUST come from the query string for "cmi.defined" statements - can be achieved by leaving empty in config.json
            var activityId = this._config._activityId || lrs.activity_id || lrs.activityId;
            // remove trailing slash if included
            activityId = activityId.replace(/\/?$/, "");

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
            this.listenToOnce(Adapt, {
                'offlineStorage:ready': this.onOfflineStorageReady,
                'app:dataLoaded': this.onDataLoaded
            });

            this.listenTo(Adapt, {
                'app:languageChanged': this.onLanguageChanged
            });

            this._activityId = this.getActivityId();
            
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
            var languageConfig = Adapt.config.get('_languagePicker');

            if (languageConfig && languageConfig._isEnabled && this._restoredLanguage !== lang && this._currentLanguage !== lang) {
                // @todo: only send when via a user selection? If `"_showOnCourseLoad": false`, this will still be triggered
                Adapt.trigger('xapi:languageChanged', lang);

                // only trigger reset if language has changed since the course was started - not neccessary before
                if (Adapt.get('_isStarted') && !languageConfig._restoreStateOnLanguageChange) Adapt.trigger('xapi:languageChangedStateReset');
            }

            this._currentLanguage = lang;
        },

        onStateLoaded: function() {
            Adapt.wait.end();

            Adapt.offlineStorage.setReadyStatus();
        },

        onDataLoaded: function() {
            var globals = Adapt.course.get('_globals');
            if (!globals._learnerInfo) globals._learnerInfo = {};            
            globals._learnerInfo = Adapt.offlineStorage.get('learnerinfo');
        }

    });

    return new xAPI();

});
