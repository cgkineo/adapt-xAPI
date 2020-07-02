define([
    'core/js/adapt',
    'core/js/enums/completionStateEnum',
    './statements/initializedStatementModel',
    './statements/terminatedStatementModel',
    './statements/preferredLanguageStatementModel',
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
], function(Adapt, COMPLETION_STATE, InitializedStatementModel, TerminatedStatementModel, PreferredLanguageStatementModel, CompletedStatementModel, ExperiencedStatementModel, McqStatementModel, SliderStatementModel, TextInputStatementModel, MatchingStatementModel, AssessmentStatementModel, ResourceItemStatementModel, FavouriteStatementModel, UnfavouriteStatementModel) {

    var StatementModel = Backbone.Model.extend({

        xAPIWrapper: null,

        _tracking: {
            _questionInteractions: true,
            _assessmentsCompletion: false,
            _assessmentCompletion: true
        },

        _hasLanguageChanged: false,
        _terminate: false,

        initialize: function(attributes, options) {
            this.listenToOnce(Adapt, {
                'adapt:initialize': this.onAdaptInitialize
            });

            this.listenTo(Adapt, {
                'xapi:languageChanged': this.onLanguageChanged
            });

            this.xAPIWrapper = options.wrapper;
            
            _.extend(this._tracking, options._tracking);

            //this.loadRecipe();
        },

        loadRecipe: function() {

        },

        setupListeners: function() {
            this._onWindowUnload = _.bind(this.onWindowUnload, this);
            $(window).on('beforeunload unload', this._onWindowUnload);
            
            this.listenTo(Adapt.contentObjects, {
                'change:_isComplete': this.onContentObjectComplete
            });

            this.listenTo(Adapt.components, {
                'change:_isComplete': this.onComponentComplete
            });

            this.listenTo(Adapt, {
                'pageView:ready': this.onPageViewReady,
                'router:location': this.onRouterLocation,
                'resources:itemClicked': this.onResourceClicked,
                'tracking:complete': this.onTrackingComplete
            });

            if (this._tracking._questionInteractions) {
                this.listenTo(Adapt, {
                    'questionView:recordInteraction': this.onQuestionInteraction
                });
            }

            // @todo: if only 1 Adapt.assessment._assessments, override so we never record both statements - leave to config.json for now?
            if (this._tracking._assessmentsCompletion) {
                this.listenTo(Adapt, {
                    'assessments:complete': this.onAssessmentsComplete
                });
            }

            if (this._tracking._assessmentCompletion) {
                this.listenTo(Adapt, {
                    'assessment:complete': this.onAssessmentComplete
                });
            }
        },

        showErrorNotification: function() {
            Adapt.trigger('xapi:lrsError');
        },

        sendInitialized: function() {
            var config = this.attributes;
            var statementModel = new InitializedStatementModel(config);
            var statement = statementModel.getData(Adapt.course);

            this.send(statement);
        },

        sendTerminated: function() {
            var model = Adapt.course;

            this.setModelDuration(model);

            var config = this.attributes;
            var statementModel = new TerminatedStatementModel(config);
            var statement = statementModel.getData(model);

            this.send(statement);
        },

        sendPreferredLanguage: function() {
            var config = this.attributes;
            var statementModel = new PreferredLanguageStatementModel(config);
            var statement = statementModel.getData(Adapt.course, Adapt.config.get('_activeLanguage'));

            this.send(statement);
        },

        sendCompleted: function(model) {
            var modelType = model.get('_type');
            if (modelType === "course" || modelType === "page") this.setModelDuration(model);

            var config = this.attributes;
            var statementModel = new CompletedStatementModel(config);
            var statement = statementModel.getData(model);

            this.send(statement);
        },

        sendExperienced: function(model) {
            this.setModelDuration(model);

            var config = this.attributes;
            var statementModel = new ExperiencedStatementModel(config);
            var statement = statementModel.getData(model);

            this.send(statement);
        },

        sendQuestionAnswered: function(model) {
            var config = this.attributes;
            var questionType = model.get('_component');
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
            var statement = statementModel.getData(model);

            this.send(statement);
        },

        sendAssessmentCompleted: function(model, state) {
            var config = this.attributes;
            var statementModel = new AssessmentStatementModel(config);
            var statement = statementModel.getData(model, state);

            this.send(statement);
        },

        sendResourceExperienced: function(model) {
            var config = this.attributes;
            var statementModel = new ResourceItemStatementModel(config);
            var statement = statementModel.getData(model);

            this.send(statement);
        },

        sendFavourite: function(model) {
            var config = this.attributes;
            var statementModel = new FavouriteStatementModel(config);
            var statement = statementModel.getData(model);

            this.send(statement);
        },

        sendUnfavourite: function(model) {
            var config = this.attributes;
            var statementModel = new UnfavouriteStatementModel(config);
            var statement = statementModel.getData(model);

            this.send(statement);
        },

        send: function(statement) {
            // don't run asynchronously when terminating as statements may not be executed before browser closes - no longer supported by Chrome - look into sendBeacon (in xAPIWrapper)
            if (this._terminate) {
                this.xAPIWrapper.sendStatement(statement);
            } else {
                this.xAPIWrapper.sendStatement(statement, function(request, obj) {
                    Adapt.log.debug("[" + obj.id + "]: " + request.status + " - " + request.statusText);

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

        setModelDuration: function(model) {
            var sessionDuration = new Date().getTime() - model.get('_sessionStartTime');
            var totalDuration = (model.get('_totalDuration') || 0) + sessionDuration;

            model.set({
                '_sessionDuration': sessionDuration,
                '_totalDuration': totalDuration
            });
        },

        onLanguageChanged: function(lang) {
            this._hasLanguageChanged = true;

            // send statement if language has changed since the course was started - call in `onAdaptInitialize` is only used initially to ensure correct execution order of statements
            if (Adapt.get('_isStarted')) this.sendPreferredLanguage();

            this.set('lang', lang);
        },

        onAdaptInitialize: function() {
            this.sendInitialized();

            Adapt.course.set('_sessionStartTime', new Date().getTime());

            this.setupListeners();

            // only called if course contains a language picker
            if (this._hasLanguageChanged) this.sendPreferredLanguage();
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

            if (model.get('_type') === "page") {
                // only record experienced statements for pages
                this.sendExperienced(model);

                model.unset('_sessionStartTime', { silent: true });
            }

            // set course duration to ensure State loss is minimised for durations data, if terminate didn't fire
            this.setModelDuration(Adapt.course);
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

        onAssessmentsComplete: function(state, model) {
            // defer as triggered before last question triggers questionView:recordInteraction
            _.defer(_.bind(this.sendAssessmentCompleted, this), model, state);
        },

        onAssessmentComplete: function(state) {
            // create model based on Adapt.course._assessment, otherwise use Adapt.course as base
            var model;
            var assessmentConfig = Adapt.course.get('_assessment');

            if (assessmentConfig && assessmentConfig._id && assessmentConfig.title) {
                model = new Backbone.Model(assessmentConfig);
            } else {
                model = Adapt.course;
            }

            _.defer(_.bind(this.sendAssessmentCompleted, this), model, state);
        },

        onTrackingComplete: function(completionData) {
            this.sendCompleted(Adapt.course);
            
            // no need to use completionData.assessment due to assessment:complete listener, which isn't restricted to only firing on tracking:complete
        },

        onQuestionInteraction: function(view) {
            this.sendQuestionAnswered(view.model);
        },

        onResourceClicked: function(data) {
            var model = new Backbone.Model();
            
            model.set({
                '_id': (data.type === 'document') ? data.filename : "?" + data.href,
                'title': data.title,
                'description': data.description,
                'url': (data.type === 'document') ? data.filename : data.href
            });

           this.sendResourceExperienced(model);
        },

        onWindowUnload: function() {
            $(window).off('beforeunload unload', this._onWindowUnload);

            if (!this._terminate) {
                this._terminate = true;

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
