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
            this.listenToOnce(Adapt, 'app:dataLoaded', this.onDataLoaded);

            this._activityId = this.getActivityId();
            
            this.initializeState();
        },

        onLaunchFailed: function() {
            Adapt.wait.end();

            Adapt.offlineStorage.setReadyStatus();
        },

        onStateLoaded: function() {
            Adapt.wait.end();

            Adapt.offlineStorage.setReadyStatus();
        },

        onDataLoaded: function() {
            this.initializeStatement();
        }

    });

    return new xAPI();

});
