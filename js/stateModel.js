define([
    'core/js/adapt',
    './offlineStorage',
    'libraries/async.min'
], function(Adapt, OfflineStorage, Async) {

    var COMPONENT_KEY = 'components';
    var LOCATION_KEY = 'location';

    var StateModel = Backbone.Model.extend({

        defaults: {
            activityId: null,
            actor: null,
            registration: null,
            components: []
        },

        initialize: function(attributes, options) {
            this.listenToOnce(Adapt, 'adapt:initialize', this.onAdaptInitialize);

            this.xAPIWrapper = options.wrapper;

            OfflineStorage.initialize(this);
            Adapt.offlineStorage.initialize(OfflineStorage);

            this.load();
        },

        setupListeners: function() {
            this.listenTo(Adapt.components, {
                'change:_isComplete': this.onIsComplete
            });
        },

        showErrorNotification: function() {
            Adapt.trigger('xapi:lrsError');
        },

        setLocation: function(id) {
            var stateId = LOCATION_KEY;
           
            if (id === "" && this.has(stateId)) {
                this.unset(stateId, {silent: true});
                this.delete(stateId);
                return;
            }

            /*
            var state = {
                id: id
            };
            */

            this.set(stateId, id);
            this.save(stateId);
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
                        //console.log("States loaded");
                        scope.restore();
                    }
                });
            }
        },

        restore: function() {
            var state = this.get(COMPONENT_KEY);

            if (state.length > 0) {
                _.each(state, function(data) {
                    var restoreData = _.omit(data, '_id');
                    var model = Adapt.components.findWhere({'_id': data._id});

                    // account for models being removed in content without xAPI activityId being changed - should we remove from state?
                    if (model) model.set(restoreData);
                });
            }

            Adapt.trigger('xapi:stateReady');
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

        onAdaptInitialize: function() {
            this.setupListeners();
        },        

        onIsComplete: function(model) {
            var stateId = COMPONENT_KEY;
            var state = this.get(stateId);

            var savedModel = _.find(state, function(sm) {
                return sm._id === model.get('_id');
            });

            var data = {
                _id: model.get('_id'),
                _isComplete: model.get('_isComplete')
            }

            if (!savedModel) {
                state.push(data);
            } else {
                savedModel = data;
            }

            this.set(stateId, state);
            this.save(stateId);
        }

    });

    return StateModel;

});
