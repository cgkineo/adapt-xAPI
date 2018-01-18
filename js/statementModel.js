define([
    'core/js/adapt',
    './statements/initializedStatementModel',
    './statements/terminatedStatementModel',
    './statements/completedStatementModel',
    './statements/experiencedStatementModel',
    './statements/mcqStatementModel',
    './statements/sliderStatementModel',
    './statements/textInputStatementModel',
    './statements/matchingStatementModel',
    './statements/assessmentStatementModel',
    './statements/resourceItemStatementModel',
    './statements/favouriteStatementModel',
    './statements/unfavouriteStatementModel'
], function(Adapt, InitializedStatementModel, TerminatedStatementModel, CompletedStatementModel, ExperiencedStatementModel, McqStatementModel, SliderStatementModel, TextInputStatementModel, MatchingStatementModel, AssessmentStatementModel, ResourceItemStatementModel, FavouriteStatementModel, UnfavouriteStatementModel) {

    var StatementModel = Backbone.Model.extend({

        defaults: {
            _shouldRecordInteractions: true,
            _terminate: false
        },

        xAPIWrapper: null,

        initialize: function(attributes, options) {
            this.listenToOnce(Adapt, 'adapt:initialize', this.onAdaptInitialize);

            this.xAPIWrapper = options.wrapper;

            //this.loadRecipe();

            this.sendInitialized();

            Adapt.course.set('_sessionStartTime', new Date().getTime());

            this._onWindowUnload = _.bind(this.onWindowUnload, this);
            $(window).on('beforeunload unload', this._onWindowUnload);
        },

        setupListeners: function() {
            this.listenTo(Adapt.contentObjects, {
                'change:_isComplete': this.onContentObjectComplete
            });

            this.listenTo(Adapt.components, {
                'change:_isComplete': this.onComponentComplete
            });

            this.listenTo(Adapt, {
                'resources:showResources': this.onShowResources,
                'pageView:ready': this.onPageViewReady,
                'router:location': this.onRouterLocation,
                'assessments:complete': this.onAssessmentsComplete,
                'filterMenuItem:togglePin': this.onFilterMenuItemPinToggled
            });

            if (this.get('_shouldRecordInteractions')) {
                this.listenTo(Adapt, {
                    'questionView:recordInteraction': this.onQuestionInteraction
                });
            }
        },

        loadRecipe: function() {

        },

        showErrorNotification: function() {
            Adapt.trigger('xapi:lrsError');
        },

        sendInitialized: function() {
            var config = this.get('_statementConfig');
            var statementModel = new InitializedStatementModel(this.get('_statementConfig'));
            var statement = statementModel.getData(Adapt.course);

            this.send(statement);
        },

        sendTerminated: function() {
            var config = this.get('_statementConfig');
            var statementModel = new TerminatedStatementModel(config);
            var statement = statementModel.getData(Adapt.course);

            this.send(statement);
        },

        sendCompleted: function(model) {
            var config = this.get('_statementConfig');
            var statementModel = new CompletedStatementModel(config);
            var statement = statementModel.getData(model);

            this.send(statement);
        },

        sendExperienced: function(model) {
            var config = this.get('_statementConfig');
            var statementModel = new ExperiencedStatementModel(config);
            var statement = statementModel.getData(model);

            this.send(statement);
        },

        sendQuestionAnswered: function(view) {
            var config = this.get('_statementConfig');
            var questionType = view.model.get('_component');
            var statementClass;

            // better solution than this factory type pattern?
            switch(questionType) {
                case "mcq":
                case "gmcq":
                    statementClass = McqStatementModel;
                    break;
                case "slider":
                    statementClass = SliderStatementModel;
                    break;
                case "textinput":
                    statementClass = TextInputStatementModel;
                    break;
                case "matching":
                    statementClass = MatchingStatementModel;
                    break;
            }

            var statementModel = new statementClass(config);
            var statement = statementModel.getData(view);

            this.send(statement);
        },

        sendAssessmentCompleted: function(model) {
            var config = this.get('_statementConfig');
            var statementModel = new AssessmentStatementModel(config);
            var statement = statementModel.getData(model);

            this.send(statement);
        },

        sendResourceExperienced: function(model) {
            var config = this.get('_statementConfig');
            var statementModel = new ResourceItemStatementModel(config);
            var statement = statementModel.getData(model);

            this.send(statement);
        },

        sendFavourite: function(model) {
            var config = this.get('_statementConfig');
            var statementModel = new FavouriteStatementModel(config);
            var statement = statementModel.getData(model);

            this.send(statement);
        },

        sendUnfavourite: function(model) {
            var config = this.get('_statementConfig');
            var statementModel = new UnfavouriteStatementModel(config);
            var statement = statementModel.getData(model);

            this.send(statement);
        },

        send: function(statement) {
            // don't run asynchronously when terminating as statements may not be executed before browser closes
            if (this.get('_terminate')) {
                this.xAPIWrapper.sendStatement(statement);
            } else {
                this.xAPIWrapper.sendStatement(statement, function(request, obj) {
                    console.log("[" + obj.id + "]: " + request.status + " - " + request.statusText);

                    switch (request.status) {
                        case 200:
                            // OK
                            break;
                        case 400:
                            // bad request - invalid statement
                            break;
                        case 401:
                            // add a session expired notification?
                        case 404:
                            // LRS not found
                            this.showErrorNotification();
                            break;
                    }
                });
            }
        },

        onAdaptInitialize: function() {
            this.setupListeners();
        },        

        onContentObjectComplete: function(model) {
            if (model.get('_isComplete') && !model.get('_isOptional')) {
                this.sendCompleted(model);
            }
        },

        onComponentComplete: function(model) {
            if (model.get('_isComplete') && model.get('_recordCompletion')) {
                this.sendCompleted(model);
            }
        },

        onAssessmentsComplete: function(state) {            
            var model = Adapt.assessment._getAssessmentByPageId(state.pageId)[0];

            // defer as triggered before last question triggers questionView:recordInteraction
            _.defer(_.bind(this.sendAssessmentCompleted, this), model);
        },

        onQuestionInteraction: function(view) {
            this.sendQuestionAnswered(view);
        },

        // add into core?
        onPageViewReady: function(view) {
            var model = view.model;

            model.set('_sessionStartTime', new Date().getTime());
        },

        onRouterLocation: function() {
            var previousId = Adapt.location._previousId;

            if (!previousId) return;

            var model = Adapt.findById(previousId);

            // only record experienced statements for pages
            if (model.get('_type') !== "page") return;

            this.sendExperienced(model);

            model.unset('_sessionStartTime', {silent: true});
        },

        onShowResources: function() {
            this.listenToOnce(Adapt, 'drawer:opened', this.onResourcesOpened);
        },

        onResourcesOpened: function() {
            // ideally we would listen to an event sent by resources
            $('.resources-item-container button').click(_.bind(this.onResourceClicked, this));
        },

        onResourceClicked: function(event) {
            var data = $(event.currentTarget).data();

            var model = new Backbone.Model();
            model.set({
                '_id': (data.type === 'document') ? data.filename : "?" + data.href,
                'title': data.title,
                'description': data.description,
                'url': (data.type === 'document') ? data.filename : data.href
            });

           this.sendResourceExperienced(model);
        },

        onFilterMenuItemPinToggled: function(model) {
            (model.get('_isPinned')) ? this.sendFavourite(model) : this.sendUnfavourite(model);
        },

        onWindowUnload: function() {
            $(window).off('beforeunload unload', this._onWindowUnload);

            if (!this.get('_terminate')) {
                this.set('_terminate', true);

                var model = Adapt.findById(Adapt.location._currentId);

                if (model && model.get('_type') !== "course") {
                    this.sendExperienced(model);
                }

                this.sendTerminated();
            }
        }

    });

    return StatementModel;

});
