import Adapt from 'core/js/adapt';
import logging from 'core/js/logging';
import wait from 'core/js/wait';
import OfflineStorageHandler from './OfflineStorageHandler';
import * as Async from 'libraries/async.min';

const COMPONENTS_KEY = 'components';
const DURATIONS_KEY = 'durations';

class StateModel extends Backbone.Model {

  defaults() {
    return {
      activityId: null,
      actor: null,
      registration: null,
      components: [],
      durations: [],
      xAPIWrapper: null,
      _isInitialized: false,
      _isLoaded: false,
      _isRestored: false,
      _queues: {},
      _tracking: {
        _storeQuestionResponses: true
      }
    };
  }

  initialize(attributes, options) {

    this.listenTo(Adapt, {
      'adapt:initialize': this.onAdaptInitialize,
      'xapi:languageChanged': this.onLanguageChanged,
      'xapi:stateReset': this.onStateReset
    });

    // Instance Variables
    this._queues = this.get('_queues');
    this.xAPIWrapper = options.wrapper;
    this._tracking = {
      ...this.defaults()._tracking,
      ...options._tracking
    };

    this.setOfflineStorageModel();
    this.load();
  }

  setOfflineStorageModel() {
    const attributes = OfflineStorageHandler.model.attributes;

    for (const key in attributes) {
      this.set(key, attributes[key]);
      this.save(key);
    }

    OfflineStorageHandler.model = this;
  }

  setupListeners() {
    this.setupModelListeners();

    // don't create new listeners for those which are still valid from initial course load
    if (this._isInitialized) return;

    this.listenTo(Adapt, {
      'xapi:durationsChange': this.onDurationChange,
      // ideally core would trigger `state.change` for each model so we don't have to return early for non-component types
      'state:change': this.onTrackableStateChange
    });
  }

  setupModelListeners() {
    this.listenTo(Adapt.course, {
      'change:_totalDuration': this.onDurationChange
    });

    this.listenTo(Adapt.contentObjects, {
      'change:_totalDuration': this.onDurationChange
    });
  }

  removeModelListeners() {
    this.stopListening(Adapt.course, {
      'change:_totalDuration': this.onDurationChange
    });

    this.stopListening(Adapt.contentObjects, {
      'change:_totalDuration': this.onDurationChange
    });
  }

  showErrorNotification() {
    Adapt.trigger('xapi:lrsError');
  }

  load() {
    this._getStates((err, data) => {
      if (err) {
        this.showErrorNotification();
      } else {
        const states = data;

        Async.each(states, (id, callback) => {
          this._fetchState(id, (err, data) => {
            if (err) {
              this.showErrorNotification();
            } else {
              // all data is now saved and retrieved as JSON, so no need for try/catch anymore
              this.set(id, data);
            }

            callback();
          });
        }, (err) => {
          if (err) {
            this.showErrorNotification();
          } else {
            this._isLoaded = true;

            Adapt.trigger('xapi:stateLoaded');

            this.listenTo(Adapt, 'app:dataReady', this.onDataReady);
          }
        });
      }
    });
  }

  reset() {
    this._getStates((err, data) => {
      if (err) {
        this.showErrorNotification();
      } else {
        wait.begin();

        const states = data;

        Async.each(states, (id, callback) => {
          this.delete(id, callback);
        }, (err) => {
          if (err) this.showErrorNotification();

          const data = {};
          data[COMPONENTS_KEY] = [];
          data[DURATIONS_KEY] = [];
          this.set(data, { silent: true });

          wait.end();
        });
      }
    });
  }

  restore() {
    this._restoreComponentsData();
    this._restoreDurationsData();

    this._isRestored = true;

    Adapt.trigger('xapi:stateReady');
  }

  set(id, value) {
    Backbone.Model.prototype.set.apply(this, arguments);

    // @todo: save every time the value changes, or only on specific events?
    if (this._isLoaded) {
      if (Adapt.terminate) {
        this.save(id);
      } else {
        const queue = this._getQueueById(id);
        queue.push(id);
      }
    }
  }

  save(id, callback) {
    const state = this.get(id);
    const data = JSON.stringify(state);

    // ensure any data being set is completed before restoring following languageChange
    if (!this._isRestored) wait.begin();

    fetch(this._getStateURL(id), {
      keepalive: Adapt.terminate || false,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.xAPIWrapper.lrs.auth,
        'X-Experience-API-Version': this.xAPIWrapper.xapiVersion
      },
      body: data
    }).then((response) => {
      if (!response.ok) throw Error(response.statusText);

      if (callback) callback();

      if (!this._isRestored) wait.end();

      return response;
    }).catch((error) => {
      if (error) {
        logging.error('An error occurred:', error);
      }
      this.showErrorNotification();
      if (callback) callback();
      if (!this._isRestored) wait.end();
    });
  }

  delete(id, callback) {
    this.unset(id, { silent: true });

    fetch(this._getStateURL(id), {
      method: 'DELETE',
      headers: {
        Authorization: this.xAPIWrapper.lrs.auth,
        'X-Experience-API-Version': this.xAPIWrapper.xapiVersion
      }
    }).then((response) => {
      if (!response.ok) throw Error(response.statusText);

      if (callback) callback();

      return response;
    }).catch((error) => {
      if (error) {
        logging.error('An error occurred:', error);
      }
      this.showErrorNotification();
      if (callback) callback();
    });
  }

  _getStateURL(stateId) {
    const activityId = this.get('activityId');
    const agent = this.get('actor');
    const registration = this.get('registration');

    let url = this.xAPIWrapper.lrs.endpoint + 'activities/state?activityId=' + encodeURIComponent(activityId) + '&agent=' + encodeURIComponent(JSON.stringify(agent));

    if (registration) url += '&registration=' + encodeURIComponent(registration);
    if (stateId) url += '&stateId=' + encodeURIComponent(stateId);

    return url;
  }

  _fetchState(stateId, callback) {
    fetch(this._getStateURL(stateId), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.xAPIWrapper.lrs.auth,
        'X-Experience-API-Version': this.xAPIWrapper.xapiVersion,
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache'
      }
    }).then((response) => {
      if (!response.ok) throw Error(response.statusText);

      return response.json();
    }).then((data) => {
      if (data) logging.debug(data);

      if (callback) callback(null, data);
    }).catch((error) => {
      if (error) {
        logging.error('Error fetching data:', error);
      }
      this.showErrorNotification();
      if (callback) callback();
    });
  }

  _getStates(callback) {
    wait.begin();

    this._fetchState(null, (err, data) => {
      if (err) {
        this.showErrorNotification();

        if (callback) callback(err, null);
      } else {
        if (callback) callback(null, data);
      }

      wait.end();
    });
  }

  _getQueueById(id) {
    let queue = this._queues[id];

    if (!queue) {
      queue = this._queues[id] = Async.queue((id, callback) => {
        this.save(id, callback);
      }, 1);

      queue.drain = () => {
        logging.debug('State API queue cleared for ' + id);
      };
    }

    return queue;
  }

  _restoreComponentsData() {
    this._restoreDataForState(this.get(COMPONENTS_KEY), Adapt.components.models);
  }

  _restoreDurationsData() {
    const models = [Adapt.course].concat(Adapt.contentObjects.models);

    this._restoreDataForState(this.get(DURATIONS_KEY), models);
  }

  _restoreDataForState(state, models) {
    if (state.length > 0) {
      state.forEach((data) => {
        const model = models.filter((model) => {
          return model.get('_id') === data._id;
        })[0];

        // account for models being removed in content without xAPI activityId or registration being changed
        if (model) {
          const restoreData = Object.keys(data).reduce((result, key) => {
            if (key !== '_id') {
              result[key] = data[key];
            }
            return result;
          }, {});

          model.set(restoreData);
        }
      });
    }
  }

  _setComponentsData(model, data) {
    const stateId = COMPONENTS_KEY;
    const state = this.get(stateId);
    const modelId = model.get('_id');
    const modelIndex = this._getStateModelIndexFor(state, modelId);

    // responses won't properly be restored until https://github.com/adaptlearning/adapt_framework/issues/2522 is resolved
    if (model.get('_isQuestionType') && !this._tracking._storeQuestionResponses) {
      delete data._isInteractionComplete;
      delete data._userAnswer;
      delete data._isSubmitted;
      delete data._score;
      delete data._isCorrect;
      delete data._attemptsLeft;
    }

    (modelIndex === null) ? state.push(data) : state[modelIndex] = data;

    this.set(stateId, state);
  }

  _setDurationsData(model) {
    const stateId = DURATIONS_KEY;
    const state = this.get(stateId);
    const modelId = model.get('_id');
    const modelIndex = this._getStateModelIndexFor(state, modelId);

    const data = {
      _id: modelId,
      _totalDuration: model.get('_totalDuration')
    };

    (modelIndex === null) ? state.push(data) : state[modelIndex] = data;

    this.set(stateId, state);
  }

  _getStateModelIndexFor(state, modelId) {
    for (let i = 0, l = state.length; i < l; i++) {
      const stateModel = state[i];
      if (stateModel._id === modelId) return i;
    }

    return null;
  }

  onDataReady() {
    const config = Adapt.config.get('_xapi');
    if (config?._isRestoreEnabled === false) return;
    wait.queue(() => {
      this.restore();
    }).bind(this);
  }

  onAdaptInitialize() {
    this.setupListeners();

    this._isInitialized = true;
  }

  onDurationChange(model) {
    this._setDurationsData(model);
  }

  onTrackableStateChange(model, state) {
    if (model.get('_type') !== 'component') return;

    // don't actually need state._isCorrect and state._score for questions, but save trackable state as provided
    this._setComponentsData(model, state);
  }

  onStateReset() {
    this.reset();
  }

  // @todo: resetting could go against cmi5 spec, if course was previously completed - can't send multiple "cmi.defined" statements for some verbs
  onLanguageChanged(lang, isStateReset) {
    if (this._isInitialized) this.removeModelListeners();

    this._isRestored = false;

    if (!isStateReset) return;

    this._getStates((err, data) => {
      if (err) {
        this.showErrorNotification();
      } else {
        wait.begin();

        const states = data;

        const statesToReset = states.filter((id) => {
          return id !== 'lang';
        });

        Async.each(statesToReset, (id, callback) => {
          this.delete(id, callback);
        }, (err) => {
          if (err) this.showErrorNotification();

          const data = {};
          data[COMPONENTS_KEY] = [];
          data[DURATIONS_KEY] = [];
          this.set(data, { silent: true });

          wait.end();
        });
      }
    });
  }

}

export default StateModel;
