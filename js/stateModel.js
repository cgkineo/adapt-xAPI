define([
  'core/js/adapt',
  './offlineStorage',
  'libraries/async.min'
], function(Adapt, OfflineStorage, Async) {

  const COMPONENTS_KEY = 'components';
  const DURATIONS_KEY = 'durations';

  const StateModel = Backbone.Model.extend({

    defaults: {
      activityId: null,
      actor: null,
      registration: null,
      components: [],
      durations: []
    },

    _tracking: {
      _storeQuestionResponses: true
    },

    xAPIWrapper: null,
    _isInitialized: false,
    _isLoaded: false,
    _isRestored: false,
    _queues: {},

    initialize: function(attributes, options) {
      this.listenTo(Adapt, {
        'adapt:initialize': this.onAdaptInitialize,
        'xapi:languageChanged': this.onLanguageChanged,
        'xapi:stateReset': this.onStateReset
      });

      this.xAPIWrapper = options.wrapper;

      _.extend(this._tracking, options._tracking);

      this.setOfflineStorageModel();

      this.load();
    },

    setOfflineStorageModel: function() {
      const attributes = OfflineStorage.model.attributes;

      for (const key in attributes) {
        this.set(key, attributes[key]);
        this.save(key);
      }

      OfflineStorage.model = this;
    },

    setupListeners: function() {
      this.setupModelListeners();

      // don't create new listeners for those which are still valid from initial course load
      if (this._isInitialized) return;

      this.listenTo(Adapt, {
        'xapi:durationsChange': this.onDurationChange,
        // ideally core would trigger `state.change` for each model so we don't have to return early for non-component types
        'state:change': this.onTrackableStateChange
      });
    },

    setupModelListeners: function() {
      this.listenTo(Adapt.course, {
        'change:_totalDuration': this.onDurationChange
      });

      this.listenTo(Adapt.contentObjects, {
        'change:_totalDuration': this.onDurationChange
      });
    },

    removeModelListeners: function() {
      this.stopListening(Adapt.course, {
        'change:_totalDuration': this.onDurationChange
      });

      this.stopListening(Adapt.contentObjects, {
        'change:_totalDuration': this.onDurationChange
      });
    },

    showErrorNotification: function() {
      Adapt.trigger('xapi:lrsError');
    },

    load: function() {
      const scope = this;

      this._getStates(function(err, data) {
        if (err) {
          scope.showErrorNotification();
        } else {
          const states = data;

          Async.each(states, function(id, callback) {
            scope._fetchState(id, function(err, data) {
              if (err) {
                scope.showErrorNotification();
              } else {
                // all data is now saved and retrieved as JSON, so no need for try/catch anymore
                scope.set(id, data);
              }

              callback();
            });
          }, function(err) {
            if (err) {
              scope.showErrorNotification();
            } else {
              scope._isLoaded = true;

              Adapt.trigger('xapi:stateLoaded');

              scope.listenTo(Adapt, 'app:dataReady', scope.onDataReady);
            }
          });
        }
      });
    },

    reset: function() {
      const scope = this;

      this._getStates(function(err, data) {
        if (err) {
          scope.showErrorNotification();
        } else {
          Adapt.wait.begin();

          const states = data;

          Async.each(states, function(id, callback) {
            scope.delete(id, callback);
          }, function(err) {
            if (err) scope.showErrorNotification();

            const data = {};
            data[COMPONENTS_KEY] = [];
            data[DURATIONS_KEY] = [];
            scope.set(data, { silent: true });

            Adapt.wait.end();
          });
        }
      });
    },

    restore: function() {
      this._restoreComponentsData();
      this._restoreDurationsData();

      this._isRestored = true;

      Adapt.trigger('xapi:stateReady');
    },

    set: function(id, value) {
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
    },

    save: function(id, callback) {
      const scope = this;
      const state = this.get(id);
      const data = JSON.stringify(state);

      // ensure any data being set is completed before restoring following languageChange
      if (!this._isRestored) Adapt.wait.begin();

      fetch(this._getStateURL(id), {
        keepalive: Adapt.terminate || false,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.xAPIWrapper.lrs.auth,
          'X-Experience-API-Version': this.xAPIWrapper.xapiVersion
        },
        body: data
      }).then(function(response) {
        // if (response) Adapt.log.debug(response);

        if (!response.ok) throw Error(response.statusText);

        if (callback) callback();

        if (!scope._isRestored) Adapt.wait.end();

        return response;
      }).catch(function(error) {
        scope.showErrorNotification();

        if (callback) callback();

        if (!scope._isRestored) Adapt.wait.end();
      });
    },

    delete: function(id, callback) {
      this.unset(id, { silent: true });

      const scope = this;

      fetch(this._getStateURL(id), {
        method: 'DELETE',
        headers: {
          Authorization: this.xAPIWrapper.lrs.auth,
          'X-Experience-API-Version': this.xAPIWrapper.xapiVersion
        }
      }).then(function(response) {
        if (!response.ok) throw Error(response.statusText);

        if (callback) callback();

        return response;
      }).catch(function(error) {
        scope.showErrorNotification();

        if (callback) callback();
      });
    },

    _getStateURL: function(stateId) {
      const activityId = this.get('activityId');
      const agent = this.get('actor');
      const registration = this.get('registration');
      let url = this.xAPIWrapper.lrs.endpoint + 'activities/state?activityId=' + encodeURIComponent(activityId) + '&agent=' + encodeURIComponent(JSON.stringify(agent));

      if (registration) url += '&registration=' + encodeURIComponent(registration);
      if (stateId) url += '&stateId=' + encodeURIComponent(stateId);

      return url;
    },

    _fetchState: function(stateId, callback) {
      const scope = this;

      fetch(this._getStateURL(stateId), {
        // cache: "no-cache",
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.xAPIWrapper.lrs.auth,
          'X-Experience-API-Version': this.xAPIWrapper.xapiVersion,
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache'
        }
      }).then(function(response) {
        if (!response.ok) throw Error(response.statusText);

        return response.json();
      }).then(function(data) {
        // if (data) Adapt.log.debug(data);

        if (callback) callback(null, data);
      }).catch(function(error) {
        scope.showErrorNotification();

        if (callback) callback();
      });
    },

    _getStates: function(callback) {
      const scope = this;

      Adapt.wait.begin();

      this._fetchState(null, function(err, data) {
        if (err) {
          scope.showErrorNotification();

          if (callback) callback(err, null);
        } else {
          if (callback) callback(null, data);
        }

        Adapt.wait.end();
      });
    },

    _getQueueById: function(id) {
      let queue = this._queues[id];

      if (!queue) {
        queue = this._queues[id] = Async.queue(_.bind(function(id, callback) {
          this.save(id, callback);
        }, this), 1);

        queue.drain = function() {
          Adapt.log.debug('State API queue cleared for ' + id);
        };
      }

      return queue;
    },

    _restoreComponentsData: function() {
      this._restoreDataForState(this.get(COMPONENTS_KEY), Adapt.components.models);
    },

    _restoreDurationsData: function() {
      const models = [Adapt.course].concat(Adapt.contentObjects.models);

      this._restoreDataForState(this.get(DURATIONS_KEY), models);
    },

    _restoreDataForState: function(state, models) {
      if (state.length > 0) {
        state.forEach(function(data) {
          const model = models.filter(function(model) {
            return model.get('_id') === data._id;
          })[0];

          // account for models being removed in content without xAPI activityId or registration being changed
          if (model) {
            const restoreData = _.omit(data, '_id');

            model.set(restoreData);
          }
        });
      }
    },

    _setComponentsData: function(model, data) {
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
    },

    _setDurationsData: function(model) {
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
    },

    _getStateModelIndexFor: function(state, modelId) {
      for (let i = 0, l = state.length; i < l; i++) {
        const stateModel = state[i];
        if (stateModel._id === modelId) return i;
      }

      return null;
    },

    onDataReady: function() {
      Adapt.wait.queue(_.bind(function() {
        this.restore();
      }, this));
    },

    onAdaptInitialize: function() {
      this.setupListeners();

      this._isInitialized = true;
    },

    onDurationChange: function(model) {
      this._setDurationsData(model);
    },

    onTrackableStateChange: function(model, state) {
      if (model.get('_type') !== 'component') return;

      // don't actually need state._isCorrect and state._score for questions, but save trackable state as provided
      this._setComponentsData(model, state);
    },

    onStateReset: function() {
      this.reset();
    },

    // @todo: resetting could go against cmi5 spec, if course was previously completed - can't send multiple "cmi.defined" statements for some verbs
    onLanguageChanged: function(lang, isStateReset) {
      if (this._isInitialized) this.removeModelListeners();

      this._isRestored = false;

      if (!isStateReset) return;

      const scope = this;

      this._getStates(function(err, data) {
        if (err) {
          scope.showErrorNotification();
        } else {
          Adapt.wait.begin();

          const states = data;

          const statesToReset = states.filter(function(id) {
            return id !== 'lang';
          });

          Async.each(statesToReset, function(id, callback) {
            scope.delete(id, callback);
          }, function(err) {
            if (err) scope.showErrorNotification();

            const data = {};
            data[COMPONENTS_KEY] = [];
            data[DURATIONS_KEY] = [];
            scope.set(data, { silent: true });

            Adapt.wait.end();
          });
        }
      });
    }

  });

  return StateModel;

});
