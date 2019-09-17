define([
    'core/js/adapt'
], function(Adapt) {

    var LaunchModel = Backbone.Model.extend({

        defaults: {
            actor: null,
            contextActivities: {
                grouping: []
            }
        },

        _xAPIWrapper: null,
        _retryCount: 0,
        _retryLimit: 1,

        initialize: function() {
            this.initializeLaunch();
        },

        initializeLaunch: function() {
            var lrs = ADL.XAPIWrapper.lrs;

            // auth could be sent through in a different process, e.g. OAuth?
            //if (lrs.endpoint && lrs.auth && lrs.actor) {
            if (lrs.endpoint && lrs.actor) {
                this._xAPIWrapper = ADL.XAPIWrapper;

                // add trailing slash if missing in endpoint
                lrs.endpoint = lrs.endpoint.replace(/\/?$/, "/");

                // capture grouping URL params - unsure what data this actually contains based on specs - unlike contextActivities for ADL Launch
                var launchCredentials = {
                    'actor': JSON.parse(lrs.actor)/*,
                    'contextActivities': launchdata.contextActivities*/
                };

                this.set(launchCredentials);

                this.triggerLaunchInitialized();
            } else {
                ADL.launch(_.bind(this.onADLLaunchAttempt, this), false);
            }
        },

        getWrapper: function() {
            return this._xAPIWrapper;
        },

        showErrorNotification: function() {
            this.listenToOnce(Adapt, 'notify:closed', this.onNotifyClosed);

            Adapt.trigger('xapi:launchError');
        },

        triggerLaunchInitialized: function() {
            _.defer(function() {
                Adapt.trigger('xapi:launchInitialized');
            });
        },

        onADLLaunchAttempt: function(err, launchdata, wrapper) {
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

                this.triggerLaunchInitialized();
            } else if (performance.navigation.type === 1) {
                this.onReload();
            } else if (this._retryCount < this._retryLimit) {
                this._retryCount++;

                this.initializeLaunch();
            } else {
                this.onLaunchFail();
            }
        },

        // if launch session expired, will the next request to the launch server produce an error notification for the user?
        onReload: function() {
            var lrs = JSON.parse(sessionStorage.getItem('lrs'));
            var launchCredentials = JSON.parse(sessionStorage.getItem('launchCredentials'));

            if (!lrs || !launchCredentials) {
                this.onLaunchFail();
                return;
            }

            this._xAPIWrapper = ADL.XAPIWrapper;
            this._xAPIWrapper.changeConfig(lrs);

            this.set(launchCredentials);

            this.triggerLaunchInitialized();
        },

        onLaunchFail: function() {
            $('.loading').hide();

            this.showErrorNotification();
        },

        onNotifyClosed: function() {
            // launch without xAPI
            Adapt.trigger('plugin:endWait');
        }

    });

    return LaunchModel;

});
