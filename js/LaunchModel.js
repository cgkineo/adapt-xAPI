import Adapt from 'core/js/adapt';
import offlineStorage from 'core/js/offlineStorage';
import wait from 'core/js/wait';

class LaunchModel extends Backbone.Model {

  defaults() {
    return {
      _launchr: null,
      _xAPIWrapper: null,
      _retryCount: 0,
      _retryLimit: 1,
      registration: null,
      actor: null,
      contextActivities: {
        grouping: []
      }
    };
  }

  initialize(attributes, options) {
    this._launchr = options._launchr;
    this.initializeLaunch();
  }

  initializeLaunch() {
    wait.begin();

    const lrs = ADL.XAPIWrapper.lrs;

    /**
     * can auth be sent through in a different process, e.g. OAuth?
     * lrs.endpoint && lrs.auth have defaults in the ADL xAPIWrapper, so can't assume their existence means they are the correct credentials - errors will be handled when communicating with the LRS
     */
    if (lrs.endpoint && lrs.auth && lrs.actor) {
      this._xAPIWrapper = ADL.XAPIWrapper;

      // add trailing slash if missing in endpoint
      lrs.endpoint = lrs.endpoint.replace(/\/?$/, '/');

      const actor = JSON.parse(lrs.actor);
      // convert actor for Rustici launch - https://github.com/RusticiSoftware/launch/blob/master/lms_lrs.md
      if (Array.isArray(actor.name)) actor.name = actor.name[0];
      if (Array.isArray(actor.mbox)) actor.mbox = actor.mbox[0];
      if (Array.isArray(actor.account)) {
        const account = actor.account[0];
        actor.account = {
          homePage: account.homePage ?? account.accountServiceHomePage,
          name: account.name ?? account.accountName
        };
      }

      // @todo: capture grouping URL params - unsure what data this actually contains based on specs - unlike contextActivities for ADL Launch
      const launchData = {
        registration: lrs.registration || null,
        actor
      };

      this.set(launchData);

      this.onLaunchSuccess();
    } else if (this._launchr?._isEnabled) {
      this.createLaunchrSession();
    } else {
      ADL.launch(this.onADLLaunchAttempt.bind(this), false);
    }
  }

  createLaunchrSession() {
    const xhr = new XMLHttpRequest();

    xhr.onreadystatechange = function() {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.response);
          const endpoint = this._launchr._domain + '/content/';

          window.history.replaceState('', '', '?xAPILaunchService=' + encodeURIComponent(endpoint) + '&xAPILaunchKey=' + encodeURIComponent(data.key));

          ADL.launch(this.onADLLaunchAttempt.bind(this), false);
        } else {
          this.onLaunchFail();
        }
      }
    }.bind(this);

    xhr.open('POST', this._launchr._domain + '/session/' + ADL.ruuid() + '/launch');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', this._launchr._auth);
    xhr.send(this.getLaunchrData());
  }

  getLaunchrData() {
    const learnerInfo = offlineStorage.get('learnerinfo');

    const data = {
      statement: {
        actor: {
          account: {
            homePage: this._launchr._accountHomePage,
            name: learnerInfo.id
          },
          name: learnerInfo.name
        }
      },
      ttl: this._launchr._ttl || 480
    };

    return JSON.stringify(data);
  }

  getWrapper() {
    return this._xAPIWrapper;
  }

  showErrorNotification() {
    Adapt.trigger('xapi:launchError');
  }

  onLaunchSuccess() {
    wait.end();

    setTimeout(function() {
      Adapt.trigger('xapi:launchInitialized');
    }, 0);
  }

  onADLLaunchAttempt(err, launchdata, wrapper) {
    /*
      200 = OK
      400 = launch already initialized
      404 = launch removed
    */
    if (err) {
      if (performance.navigation.type === 1) {
        this.onReload();
        return;
      }

      if (this._retryCount < this._retryLimit) {
        this._retryCount++;
        this.initializeLaunch();
        return;
      }

      this.onLaunchFail();
      return;
    }

    this._xAPIWrapper = wrapper;

    // can ADL launch include registration?
    const launchData = {
      registration: launchdata.registration || null,
      actor: launchdata.actor
    };

    const contextActivities = launchdata.contextActivities;
    if (contextActivities && Object.keys(contextActivities).length > 0) {
      launchData.contextActivities = contextActivities;
    }

    this.set(launchData);

    // store launch server details should browser be reloaded and launch server session still initialized
    sessionStorage.setItem('lrs', JSON.stringify(wrapper.lrs));
    sessionStorage.setItem('launchData', JSON.stringify(launchData));

    this.onLaunchSuccess();
  }

  // if launch session expired, will the next request to the launch server produce an error notification for the user?
  onReload() {
    const lrs = JSON.parse(sessionStorage.getItem('lrs'));
    const launchData = JSON.parse(sessionStorage.getItem('launchData'));

    if (!lrs || !launchData) {
      this.onLaunchFail();
      return;
    }

    this._xAPIWrapper = ADL.XAPIWrapper;
    this._xAPIWrapper.changeConfig(lrs);

    this.set(launchData);

    this.onLaunchSuccess();
  }

  onLaunchFail() {
    wait.end();

    Adapt.trigger('xapi:launchFailed');

    this.showErrorNotification();
  }
}

export default LaunchModel;
