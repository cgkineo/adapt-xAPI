define([
    'core/js/adapt',
    './offlineStorage',
    'libraries/async.min'
], function(Adapt, OfflineStorage, Async) {

    var COMPONENTS_KEY = 'components';
    var DURATIONS_KEY = 'durations';

    var StateModel = Backbone.Model.extend({

        defaults: {
            activityId: null,
            actor: null,
            registration: null,
            components: [],
            durations: []
        },

        _shouldStoreResponses: false,
        _isLoaded: false,
        _isRestored: false,

        initialize: function(attributes, options) {
            this.listenToOnce(Adapt, 'adapt:initialize', this.onAdaptInitialize);

            this.xAPIWrapper = options.wrapper;
            this._shouldStoreResponses = options._shouldStoreResponses;

            this.setOfflineStorageModel();

            this.load();
        },

        setOfflineStorageModel: function() {
            var attributes = OfflineStorage.model.attributes;

            for (var key in attributes) {
                this.set(key, attributes[key]);
                this.save(key);
            }

            OfflineStorage.model = this;
        },

        setupListeners: function() {
            this.listenTo(Adapt, {
                // ideally core would trigger this event for each model so we don't have to return early for non-component types
                'state:change': this.onTrackableStateChange
            });

            this.listenTo(Adapt.contentObjects, {
                'change:_totalDuration': this.onDurationChange
            });
        },

        showErrorNotification: function() {
            Adapt.trigger('xapi:lrsError');
        },

        load: function() {
            var activityId = this.get('activityId');
            var actor = this.get('actor');
            var registration = this.get('registration');
            var states = this.xAPIWrapper.getState(activityId, actor);

            if (states === null) {
                this.showErrorNotification();
            } else {
                var scope = this;

                Async.each(states, function(id, callback) {
                    scope.xAPIWrapper.getState(activityId, actor, id, registration, null, function(request) {
                        Adapt.log.debug(request.response);

                        switch (request.status) {
                            case 200:
                                var state;
                                var response = request.response;

                                // account for invalid JSON string?
                                try {
                                    state = JSON.parse(response);
                                } catch(e) {
                                    state = response;
                                }

                                scope.set(id, state);
                                break;
                            case 404:
                                Adapt.log.error("Could not find " + id + " in State API.");
                                break;
                        }

                        callback();
                    });
                }, function(err) {
                    if (err) {
                        scope.showErrorNotification();
                    } else {
                        scope._isLoaded = true;

                        Adapt.trigger('xapi:stateLoaded');

                        scope.listenToOnce(Adapt, 'app:dataReady', scope.onDataReady);
                    }
                });
            }
        },

        restore: function() {
            this._restoreComponentsData();
            this._restoreDurationsData();

            this._isRestored = true;

            Adapt.trigger('xapi:stateReady');
        },

        set: function(id, value) {
            Backbone.Model.prototype.set.apply(this, arguments);

            // @todo: save everytime the value changes, or only on specific events?
            if (this._isRestored) this.save(id);
        },

        save: function(id) {
            this.xAPIWrapper.sendState(this.get('activityId'), this.get('actor'), id, this.get('registration'), this.get(id), null, null, function(request) {
                Adapt.log.debug(request.response);

                switch (request.status) {
                    case 204:
                        // no content
                        break;
                    case 401:
                        // @todo: add a session expired notification?
                    case 404:
                        this.showErrorNotification();
                        break;
                }
            });
        },

        delete: function(id) {
            this.xAPIWrapper.deleteState(this.get('activityId'), this.get('actor'), id, this.get('registration'), this.get(id), null, function(request) {
                Adapt.log.debug(request.response);

                switch (request.status) {
                    case 204:
                        // no content
                        break;
                    case 401:
                        // @todo: add a session expired notification?
                    case 404:
                        this.showErrorNotification();
                        break;
                }
            });
        },

        _restoreComponentsData: function(data) {
            this._restoreDataForState(this.get(COMPONENTS_KEY), Adapt.contentObjects);
        },

        _restoreDurationsData: function(data) {
            this._restoreDataForState(this.get(DURATIONS_KEY), Adapt.contentObjects);
        },

        _restoreDataForState: function(state, collection) {
            if (state.length > 0) {
                state.forEach(function(data) {
                    var model = collection.findWhere({ '_id': data._id });
                    var restoreData = _.omit(data, '_id');

                    // account for models being removed in content without xAPI activityId or registration being changed
                    if (model) model.set(restoreData);
                });
            }
        },

        _setComponentsData: function(model, data) {
            var stateId = COMPONENTS_KEY;
            var state = this.get(stateId);
            var modelId = model.get('_id');
            var modelIndex = this._getStateModelIndexFor(state, modelId);

            // responses won't properly be restored until https://github.com/adaptlearning/adapt_framework/issues/2522 is resolved
            if (model.get('_isQuestionType') && !this._shouldStoreResponses) {
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
            var stateId = DURATIONS_KEY;
            var state = this.get(stateId);
            var modelId = model.get('_id');
            var modelIndex = this._getStateModelIndexFor(state, modelId);

            var data = {
                _id: modelId,
                _totalDuration: model.get('_totalDuration')
            };

            (modelIndex === null) ? state.push(data) : state[modelIndex] = data;

            this.set(stateId, state);
        },

        _getStateModelIndexFor: function(state, modelId) {
            for (var i = 0, l = state.length; i < l; i++) {
                var stateModel = state[i];
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
        },

        onDurationChange: function(model) {
            this._setDurationsData(model);
        },

        onTrackableStateChange: function(model, state) {
            if (model.get('_type') !== 'component') return;

            // don't actually need state._isCorrect and state._score for questions, but save trackable state as provided
            this._setComponentsData(model, state);
        }

    });

    return StateModel;

});
