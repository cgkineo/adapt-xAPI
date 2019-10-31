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
        errorNotificationModel: null,
        launchModel: null,
        statementModel: null,
        stateModel: null,

        initialize: function() {
            this.listenToOnce(Adapt, {
                'offlineStorage:prepare': this.onPrepareOfflineStorage,
                'app:dataLoaded': this.onDataLoaded
            });
        },

        initializeErrorNotification: function() {
            var config = this._config._errors;

            this.errorNotificationModel = new ErrorNotificationModel(config);
        },

        initializeLaunch: function() {
            this.listenToOnce(Adapt, 'xapi:launchInitialized', this.onLaunchInitialized);

            this.launchModel = new LaunchModel();
        },

        initializeStatement: function() {
            var config = {
                _statementConfig: {
                    lang: Adapt.config.get('_activeLanguage'),
                    activityId: this.getActivityId(),
                    //registration: this.launchModel.get('registration'),
                    actor: this.launchModel.get('actor'),
                    contextActivities: this.launchModel.get('contextActivities')
                }
            };

            this.statementModel = new StatementModel(config, {
                wrapper: this.launchModel.getWrapper(),
                _shouldRecordInteractions: this._config._tracking._shouldRecordInteractions
            });
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
                _shouldStoreResponses: this._config._tracking._shouldStoreResponses
            });
        },

        getActivityId: function() {
            // @todo: if using cmi5 the activityId MUST come from the query string for "cmi.defined" statements
            return this._config._activityId || this.launchModel.getWrapper().lrs.activityId;
        },

        // @todo: will cause conflict with adapt-contrib-spoor, even if xAPI is disabled
        onPrepareOfflineStorage: function() {
            Adapt.offlineStorage.initialize(OfflineStorage);
            Adapt.offlineStorage.setReadyStatus();
        },

        onDataLoaded: function() {
            this._config = Adapt.config.get('_xapi');

            if (this._config && this._config._isEnabled) {
                Adapt.wait.begin();

                this.initializeErrorNotification();
                this.initializeLaunch();
            }
        },

        onLaunchInitialized: function() {
            this.initializeStatement();
            this.initializeState();
        },

        onStateLoaded: function() {
            Adapt.wait.end();
        }

    });

    return new xAPI();

});
