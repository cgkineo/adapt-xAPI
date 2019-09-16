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

    var xAPI = _.extend({

        _config: null,
        errorNotificationModel: null,
        launchModel: null,
        statementModel: null,
        stateModel: null,

        initialize: function() {
            this.listenToOnce(Adapt, 'app:dataLoaded', this.onDataLoaded);
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
                    actor: this.launchModel.get('actor'),
                    contextActivities: this.launchModel.get('contextActivities')
                },
                _shouldRecordInteractions: this._config._tracking._shouldRecordInteractions
            };

            this.statementModel = new StatementModel(config, { wrapper: this.launchModel.getWrapper() });
        },

        initializeState: function() {
            this.listenTo(Adapt, 'xapi:stateLoaded', this.onStateLoaded);

            var config = {
                activityId: this.getActivityId(),
                actor: this.launchModel.get('actor')
            };

            this.stateModel = new StateModel(config, {
                wrapper: this.launchModel.getWrapper(),
                _shouldStoreResponses: this._config._tracking._shouldStoreResponses
            });
        },

        getActivityId: function() {
            return this._config._activityId || this.launchModel.getWrapper().lrs.activityId;
        },

        onDataLoaded: function() {
            this._config = Adapt.config.get('_xapi');

            if (this._config && this._config._isEnabled) {
                Adapt.trigger('plugin:beginWait');

                Adapt.offlineStorage.initialize(OfflineStorage);
                Adapt.offlineStorage.setReadyStatus();

                this.initializeErrorNotification();
                this.initializeLaunch();
            }
        },

        onLaunchInitialized: function() {
            this.initializeStatement();
            this.initializeState();
        },

        onStateLoaded: function() {
            Adapt.trigger('plugin:endWait');
        }

    }, Backbone.Events);

    xAPI.initialize();

    return xAPI;

});
