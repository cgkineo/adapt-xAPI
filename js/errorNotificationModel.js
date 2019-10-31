define([
    'core/js/adapt'
], function(Adapt) {

    var ErrorNotificationModel = Backbone.Model.extend({

        initialize: function() {
            this.listenToOnce(Adapt, {
                'xapi:launchError': this.onShowLaunchError,
                'xapi:lrsError': this.onShowLRSError
            });
        },

        showNotification: function(config) {
            var notifyObject = {
                _type: 'popup',
                title: config.title,
                body: config.body
            };

            Adapt.log.error(config.title);

            Adapt.trigger('notify:popup', notifyObject);
        },

        onShowLaunchError: function() {
            this.showNotification(this.get('_launch'));
        },

        onShowLRSError: function() {
            this.showNotification(this.get('_lrs'));
        }

    });

    return ErrorNotificationModel;

});
