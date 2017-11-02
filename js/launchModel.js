define([
    'core/js/adapt'
], function(Adapt) {

    var LaunchModel = Backbone.Model.extend({

        defaults: {
            actor: null,
            contextActivities: {}
        },

        _xAPIWrapper: null,
        _retryCount: 0,
        _retryLimit: 1,

        initialize: function() {
            this.initializeLaunch();
        },

        initializeLaunch: function() {
            ADL.launch(_.bind(this.onLaunchAttempt, this), false);
        },

        getWrapper: function() {
            return this._xAPIWrapper;
        },

        showErrorNotification: function() {
            this.listenToOnce(Adapt, 'notify:closed', this.onNotifyClosed);

            Adapt.trigger('xapi:launchError');
        },

        onLaunchAttempt: function(err, launchdata, wrapper) {
            /*
            200 = OK
            400 = launch already initialized
            404 = launch removed
            */
            if (!err) {
                this._xAPIWrapper = wrapper;

                var launchCredentials = {
                    'actor': launchdata.actor,
                    'contextActivities': launchdata.contextActivities
                };

                this.set(launchCredentials);

                // store launch server details should browser be reloaded and launch server session still initialized
                sessionStorage.setItem('lrs', JSON.stringify(wrapper.lrs));
                sessionStorage.setItem('launchCredentials', JSON.stringify(launchCredentials));

                Adapt.trigger('xapi:launchInitialized');
            } else if (performance.navigation.type === 1) {
                this.onReload();
            } else if (this._retryCount < this._retryLimit) {
                this._retryCount++;

                this.initializeLaunch();
            } else {
                $('.loading').hide();

                this.showErrorNotification();
            }
        },

        // if launch session expired, will the next request to the launch server produce an error notification for the user?
        onReload: function() {
            var lrs = JSON.parse(sessionStorage.getItem('lrs'));
            var launchCredentials = JSON.parse(sessionStorage.getItem('launchCredentials'));

            this._xAPIWrapper = ADL.XAPIWrapper;
            this._xAPIWrapper.changeConfig(lrs);

            this.set(launchCredentials);

            Adapt.trigger('xapi:launchInitialized');
        },

        onNotifyClosed: function() {
            // launch without xAPI
            Adapt.trigger('plugin:endWait');
        }

    });

    return LaunchModel;

});
