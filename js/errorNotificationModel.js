define([
    'core/js/adapt'
], function(Adapt) {

    var ErrorNotificationModel = Backbone.Model.extend({

        _isReady: false,

        initialize: function() {
            this.listenToOnce(Adapt, {
                'app:dataLoaded': this.onDataLoaded,
                'xapi:launchError': this.onShowLaunchError,
                'xapi:activityIdError': this.onShowActivityIdError,
                'xapi:lrsError': this.onShowLRSError
            });
        },

        showNotification: function(config, isDeferred) {
            if (this._isReady) {
                var notifyObject = {
                    _type: 'popup',
                    title: config.title,
                    body: config.body
                };

                var isCancellable = true;

                if (config.hasOwnProperty('_isCancellable')) {
                    isCancellable = config._isCancellable;
                    notifyObject._isCancellable = isCancellable;
                    notifyObject._closeOnShadowClick = !isCancellable;
                }
    
                Adapt.log.error(config.title);

                if (isDeferred) {
                    Adapt.wait.begin();

                    if (isCancellable) this.listenToOnce(Adapt, 'notify:closed', this.onNotifyClosed);

                    $('.loading').hide();
                }
    
                Adapt.trigger('notify:popup', notifyObject);
            } else {
                this.listenToOnce(Adapt, 'app:dataLoaded', _.partial(this.showNotification, config, true));
            }
        },

        /**
         * Can't show notify until data has loaded due to `import_globals` in template
         */
        onDataLoaded: function() {
            this._isReady = true;
        },

        onShowLaunchError: function() {
            this.showNotification(this.get('_launch'));
        },

        onShowActivityIdError: function() {
            this.showNotification(this.get('_activityId'));
        },

        onShowLRSError: function() {
            this.showNotification(this.get('_lrs'));
        },

        onNotifyClosed: function() {
            Adapt.wait.end();
        }

    });

    return ErrorNotificationModel;

});
