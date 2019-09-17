define([
    'core/js/adapt',
    './offlineStorage',
    'libraries/async.min'
], function(Adapt, OfflineStorage, Async) {

    var COMPONENT_KEY = 'components';

    var StateModel = Backbone.Model.extend({

        defaults: {
            activityId: null,
            actor: null,
            registration: null,
            components: []
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
                this.listenTo(model, {
                    'change:_isSubmitted': this.onSubmittedChange,
                    'change:_isInteractionComplete': this.onInteractionCompleteChange
                });
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
            this._restoreComponentData();

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

        _restoreComponentData: function(data) {
            var state = this.get(COMPONENT_KEY);

            if (state.length > 0) {
                state.forEach(function(data) {
                    var restoreData = _.omit(data, '_id');
                    var model = Adapt.components.findWhere({ '_id': data._id });

                    // account for models being removed in content without xAPI activityId being changed - should we remove from state?
                    if (model) model.set(restoreData);
                });
            }
        },

        _setComponentData: function(model) {
            var stateId = COMPONENT_KEY;
            var state = this.get(stateId);
            var modelId = model.get('_id');
            var modelIndex;

            state.forEach(function(sm, index) {
                if (sm._id === modelId) {
                    modelIndex = index;
                    return index;
                }
            });

            var data = {
                _id: modelId,
                _isInteractionComplete: model.get('_isInteractionComplete'),
                _isComplete: model.get('_isComplete')
            };

            if (this._shouldStoreResponses && model.get('_isQuestionType')) {
                data._userAnswer = model.get('_userAnswer');
                data._attemptsLeft = model.get('_attemptsLeft');
                data._isSubmitted = model.get('_isSubmitted');
                //data._isCorrect = model.get('_isCorrect');
                //data._score = model.get('_score');
            }

            (modelIndex === undefined) ? state.push(data) : state[modelIndex] = data;

            this.set(stateId, state);
        },

        onDataReady: function() {
            Adapt.trigger('plugin:beginWait');

            this.restore();

            Adapt.trigger('plugin:endWait');
        }, 

        onAdaptInitialize: function() {
            this.setupListeners();
        },

        onSubmittedChange: function(model) {
            // _userAnswer changes after _isSubmitted, so wait before amending state
            // responses still won't properly be restored until https://github.com/adaptlearning/adapt_framework/issues/2522 is resolved
            this.listenToOnce(model, 'change:_userAnswer', this.onUserAnswerChange);
        },

        onUserAnswerChange: function(model) {
            this._setComponentData(model);
        },

        onInteractionCompleteChange: function(model) {
            this._setComponentData(model);
        }

    });

    return StateModel;

});
