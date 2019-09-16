define([
    'core/js/adapt',
    './offlineStorage',
    'libraries/async.min'
], function(Adapt, OfflineStorage, Async) {

    var COMPONENT_KEY = 'components';
    var QUESTION_KEY = 'questions';

    var StateModel = Backbone.Model.extend({

        defaults: {
            activityId: null,
            actor: null,
            registration: null,
            components: [],
            questions: []
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
            Adapt.components.models.forEach(function(model) {
                if (this._shouldStoreResponses && model.get('_isQuestionType')) {
                    this.listenTo(model, 'change:_isInteractionComplete', this.onQuestionInteractionComplete);
                }

                this.listenTo(model, 'change:_isComplete', this.onComponentComplete);
            }, this);
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
                        console.log(request.response);

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
                                // state not found
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
            this._restoreComponentDataForStateId(COMPONENT_KEY);
            this._restoreComponentDataForStateId(QUESTION_KEY);

            this._isRestored = true;

            Adapt.trigger('xapi:stateReady');
        },

        set: function(id, value) {
            Backbone.Model.prototype.set.apply(this, arguments);

            // save everytime the value changes, or only on specific events?
            if (this._isRestored) this.save(id);
        },

        save: function(id) {
            this.xAPIWrapper.sendState(this.get('activityId'), this.get('actor'), id, this.get('registration'), this.get(id), null, null, function(request) {
                console.log(request.response);

                switch (request.status) {
                    case 204:
                        break;
                    case 401:
                        // add a session expired notification?
                    case 404:
                        this.showErrorNotification();
                        break;
                }
            });
        },

        delete: function(id) {
            this.xAPIWrapper.deleteState(this.get('activityId'), this.get('actor'), id, this.get('registration'), this.get(id), null, function(request) {
                console.log(request.response);

                switch (request.status) {
                    case 204:
                        break;
                    case 401:
                        // add a session expired notification?
                    case 404:
                        this.showErrorNotification();
                        break;
                }
            });
        },

        _restoreComponentDataForStateId: function(stateId, data) {
            var state = this.get(stateId);

            if (state.length > 0) {
                state.forEach(function(data) {
                    var restoreData = _.omit(data, '_id');
                    var model = Adapt.components.findWhere({ '_id': data._id });

                    // account for models being removed in content without xAPI activityId being changed - should we remove from state?
                    if (model) model.set(restoreData);
                });
            }
        },

        onDataReady: function() {
            Adapt.trigger('plugin:beginWait');

            this.restore();

            Adapt.trigger('plugin:endWait');
        }, 

        onAdaptInitialize: function() {
            this.setupListeners();
        },

        onQuestionInteractionComplete: function(model) {
            var stateId = QUESTION_KEY;
            var state = this.get(stateId);
            var modelId = model.get('_id');
            var modelIndex;
            var isInteractionComplete = model.get('_isInteractionComplete');

            state.forEach(function(sm, index) {
                if (sm._id === modelId) {
                    modelIndex = index;
                    return index;
                }
            });

            if (isInteractionComplete) {
                var data = {
                    _id: modelId,
                    _userAnswer: model.get('_userAnswer'),
                    //_score: model.get('_score'),
                    _attemptsLeft: model.get('_attemptsLeft'),
                    _isSubmitted: model.get('_isSubmitted'),
                    //_isCorrect: model.get('_isCorrect'),
                    _isInteractionComplete: isInteractionComplete
                };
    
                (modelIndex === undefined) ? state.push(data) : state[modelIndex] = data;
            } else {
                state.splice(modelIndex, 1);
            }

            this.set(stateId, state);
        },

        onComponentComplete: function(model) {
            var stateId = COMPONENT_KEY;
            var state = this.get(stateId);
            var modelId = model.get('_id');
            var modelIndex;
            var isComplete = model.get('_isComplete');

            state.forEach(function(sm, index) {
                if (sm._id === modelId) {
                    modelIndex = index;
                    return index;
                }
            });

            if (isComplete) {
                var data = {
                    _id: modelId,
                    _isComplete: isComplete
                };
    
                (modelIndex === undefined) ? state.push(data) : state[modelIndex] = data;
            } else {
                state.splice(modelIndex, 1);
            }

            this.set(stateId, state);
        }

    });

    return StateModel;

});
