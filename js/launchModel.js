define([
  'core/js/adapt'
], function(Adapt) {

  const LaunchModel = Backbone.Model.extend({

    defaults: {
      registration: null,
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
      const lrs = ADL.XAPIWrapper.lrs;

      /**
             * can auth be sent through in a different process, e.g. OAuth?
             * lrs.endpoint && lrs.auth have defaults in the ADL xAPIWrapper, so can't assume their existence means they are the correct credentials - errors will be handled when communicating with the LRS
             */
      if (lrs.endpoint && lrs.auth && lrs.actor) {
        this._xAPIWrapper = ADL.XAPIWrapper;

        // add trailing slash if missing in endpoint
        lrs.endpoint = lrs.endpoint.replace(/\/?$/, '/');

        // @todo: capture grouping URL params - unsure what data this actually contains based on specs - unlike contextActivities for ADL Launch
        const launchData = {
          registration: lrs.registration || null,
          actor: JSON.parse(lrs.actor)/*,
                    'contextActivities': launchdata.contextActivities */
        };

        this.set(launchData);

        this.triggerLaunchInitialized();
      } else {
        ADL.launch(_.bind(this.onADLLaunchAttempt, this), false);
      }
    },

    getWrapper: function() {
      return this._xAPIWrapper;
    },

    showErrorNotification: function() {
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

        // can ADL launch include registration?
        const launchData = {
          registration: launchdata.registration || null,
          actor: launchdata.actor
        };

        const contextActivities = launchdata.contextActivities;
        if (!(_.isEmpty(contextActivities))) launchData.contextActivities = contextActivities;

        this.set(launchData);

        // store launch server details should browser be reloaded and launch server session still initialized
        sessionStorage.setItem('lrs', JSON.stringify(wrapper.lrs));
        sessionStorage.setItem('launchData', JSON.stringify(launchData));

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
      const lrs = JSON.parse(sessionStorage.getItem('lrs'));
      const launchData = JSON.parse(sessionStorage.getItem('launchData'));

      if (!lrs || !launchData) {
        this.onLaunchFail();
        return;
      }

      this._xAPIWrapper = ADL.XAPIWrapper;
      this._xAPIWrapper.changeConfig(lrs);

      this.set(launchData);

      this.triggerLaunchInitialized();
    },

    onLaunchFail: function() {
      Adapt.trigger('xapi:launchFailed');

      this.showErrorNotification();
    }

  });

  return LaunchModel;

});
