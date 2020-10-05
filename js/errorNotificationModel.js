define([
    'core/js/adapt'
], function(Adapt) {

    var LAUNCH_ERROR_ID = "launch-error";
    var ACTIVITYID_ERROR_ID = "activityId-error";
    var LRS_ERROR_ID = "lrs-error";

    var ErrorNotificationModel = Backbone.Model.extend({

        _isReady: false,
        _isNotifyOpen: false,
        _isDeferredLoadingError: false,
        _currentNotifyId: null,

        initialize: function() {
            this.listenToOnce(Adapt, {
                'app:dataLoaded': this.onDataLoaded
            });

            this.listenTo(Adapt, {
                'xapi:launchError': this.onShowLaunchError,
                'xapi:activityIdError': this.onShowActivityIdError,
                'xapi:lrsError': this.onShowLRSError,
                'notify:closed': this.onNotifyClosed
            });
        },

        _showNotification: function(config, id) {
            if (this._isReady) {
                if (!this._isNotifyOpen) {
                    Adapt.log.error(config.title);

                    var notifyConfig = this._getNotifyConfig(config, id);

                    Adapt.trigger('notify:popup', notifyConfig);

                    this._isNotifyOpen = true;
                    this._currentNotifyId = id;

                } else if (this._currentNotifyId !== id) {
                    this.listenToOnce(Adapt, 'notify:closed', _.partial(this._showNotification, config, id));
                }
            } else {
                this._isDeferredLoadingError = true;

                this.listenToOnce(Adapt, 'app:dataLoaded', _.partial(this._showNotification, config, id));
            }
        },

        _getNotifyConfig: function(config, id) {
            var notifyConfig = {
                title: config.title,
                body: config.body,
                _classes: "xAPIError " + id + " " + config._classes,
                _isxAPIError: true
            };

            var isCancellable = true;

            if (config.hasOwnProperty('_isCancellable')) {
                isCancellable = config._isCancellable;
                notifyConfig._isCancellable = isCancellable;
                notifyConfig._closeOnShadowClick = !isCancellable;
            }

            return notifyConfig;
        },

        /**
         * Can't show notify until data has loaded due to `import_globals` in template
         */
        onDataLoaded: function() {
            this._isReady = true;

            if (this._isDeferredLoadingError) {
                Adapt.wait.begin();

                $('.loading').hide();
            }
        },

        onShowLaunchError: function() {
            this._showNotification(this.get('_launch'), LAUNCH_ERROR_ID);
        },

        onShowActivityIdError: function() {
            this._showNotification(this.get('_activityId'), ACTIVITYID_ERROR_ID);
        },

        onShowLRSError: function() {
            this._showNotification(this.get('_lrs'), LRS_ERROR_ID);
        },

        onNotifyClosed: function(notify) {
            if (!notify.model.get('_isxAPIError')) return;

            if (this._isDeferredLoadingError) {
                Adapt.wait.end();

                this._isDeferredLoadingError = false;

                // cancel other errors if launch failed and user dismissed, as it won't track regardless
                this.stopListening();
            }

            this._isNotifyOpen = false;
            this._currentNotifyId = null;
        }

    });

    return ErrorNotificationModel;

});
