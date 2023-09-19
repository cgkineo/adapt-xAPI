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

  const StatementModel = Backbone.Model.extend({

    _tracking: {
      _questionInteractions: true,
      _assessmentsCompletion: false,
      _assessmentCompletion: true
    },

    xAPIWrapper: null,
    _isInitialized: false,
    _hasLanguageChanged: false,
    _courseSessionStartTime: null,
    _currentPageModel: null,
    _terminate: false,

    initialize: function(attributes, options) {
      this.listenTo(Adapt, {
        'adapt:initialize': this.onAdaptInitialize,
        'xapi:languageChanged': this.onLanguageChanged
      });

      this.xAPIWrapper = options.wrapper;

      _.extend(this._tracking, options._tracking);

      // this.loadRecipe();
    },

    loadRecipe: function() {

    },

    setupListeners: function() {
      this.setupModelListeners();

      // don't create new listeners for those which are still valid from initial course load
      if (this._isInitialized) return;

      this._onVisibilityChange = _.bind(this.onVisibilityChange, this);
      $(document).on('visibilitychange', this._onVisibilityChange);

      this._onWindowUnload = _.bind(this.onWindowUnload, this);
      $(window).on('beforeunload unload', this._onWindowUnload);

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

    setupModelListeners: function() {
      this.listenTo(Adapt.contentObjects, {
        'change:_isComplete': this.onContentObjectComplete
      });

      this.listenTo(Adapt.components, {
        'change:_isComplete': this.onComponentComplete
      });
    },

    removeModelListeners: function() {
      this.stopListening(Adapt.contentObjects, {
        'change:_isComplete': this.onContentObjectComplete
      });

      this.stopListening(Adapt.components, {
        'change:_isComplete': this.onComponentComplete
      });
    },

    showErrorNotification: function() {
      Adapt.trigger('xapi:lrsError');
    },

    sendInitialized: function() {
      const config = this.attributes;
      const statementModel = new InitializedStatementModel(config);
      const statement = statementModel.getData(Adapt.course);

      this.send(statement);
    },

    sendTerminated: function() {
      const model = Adapt.course;

      this.setModelDuration(model);

      const config = this.attributes;
      const statementModel = new TerminatedStatementModel(config);
      const statement = statementModel.getData(model);

      this.send(statement);
    },

    sendPreferredLanguage: function() {
      const config = this.attributes;
      const statementModel = new PreferredLanguageStatementModel(config);
      const statement = statementModel.getData(Adapt.course, Adapt.config.get('_activeLanguage'));

      this.send(statement);
    },

    sendCompleted: function(model) {
      const modelType = model.get('_type');
      if (modelType === 'course' || modelType === 'page') this.setModelDuration(model);

      const config = this.attributes;
      const statementModel = new CompletedStatementModel(config);
      const statement = statementModel.getData(model);

      this.send(statement);
    },

    sendExperienced: function(model) {
      this.setModelDuration(model);

      const config = this.attributes;
      const statementModel = new ExperiencedStatementModel(config);
      const statement = statementModel.getData(model);

      this.send(statement);

      model.unset('_sessionStartTime', { silent: true });
      model.unset('_sessionDuration', { silent: true });
    },

    sendQuestionAnswered: function(model) {
      const config = this.attributes;
      const questionType = model.get('_component');
      let statementClass;

      // better solution than this factory type pattern?
      switch (questionType) {
        case 'mcq':
        case 'gmcq':
          statementClass = McqStatementModel;
          break;
        case 'slider':
          statementClass = SliderStatementModel;
          break;
        case 'textinput':
          statementClass = TextInputStatementModel;
          break;
        case 'matching':
          statementClass = MatchingStatementModel;
          break;
      }

      const statementModel = new statementClass(config);
      const statement = statementModel.getData(model);

      this.send(statement);
    },

    sendAssessmentCompleted: function(model, state) {
      const config = this.attributes;
      const statementModel = new AssessmentStatementModel(config);
      const statement = statementModel.getData(model, state);

      this.send(statement);
    },

    sendResourceExperienced: function(model) {
      const config = this.attributes;
      const statementModel = new ResourceItemStatementModel(config);
      const statement = statementModel.getData(model);

      this.send(statement);
    },

    sendFavourite: function(model) {
      const config = this.attributes;
      const statementModel = new FavouriteStatementModel(config);
      const statement = statementModel.getData(model);

      this.send(statement);
    },

    sendUnfavourite: function(model) {
      const config = this.attributes;
      const statementModel = new UnfavouriteStatementModel(config);
      const statement = statementModel.getData(model);

      this.send(statement);
    },

    /*
         * @todo: Add Fetch API into xAPIWrapper - https://github.com/adlnet/xAPIWrapper/issues/166
         */
    send: function(statement) {
      const lrs = this.xAPIWrapper.lrs;
      const url = lrs.endpoint + 'statements';
      const data = JSON.stringify(statement);
      const scope = this;

      fetch(url, {
        keepalive: this._terminate,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: lrs.auth,
          'X-Experience-API-Version': this.xAPIWrapper.xapiVersion
        },
        body: data
      }).then(function(response) {
        Adapt.log.debug('[' + statement.id + ']: ' + response.status + ' - ' + response.statusText);

        if (!response.ok) throw Error(response.statusText);

        return response;
      }).catch(function(error) {
        scope.showErrorNotification();
      });
    },

    setModelSessionStartTime: function(model, restoredTime) {
      const time = restoredTime || new Date().getTime();

      model.set('_sessionStartTime', time);

      // capture start time for course session as models are reloaded on a language change
      if (model.get('_type') === 'course') this._courseSessionStartTime = time;
    },

    setModelDuration: function(model) {
      const elapsedTime = new Date().getTime() - model.get('_sessionStartTime');

      // reset `_sessionStartTime` to prevent cumulative additions via multiple calls to this method within the same session - mostly affects course model
      this.setModelSessionStartTime(model);

      model.set({
        _sessionDuration: (model.get('_sessionDuration') || 0) + elapsedTime,
        _totalDuration: (model.get('_totalDuration') || 0) + elapsedTime
      });
    },

    onLanguageChanged: function(lang, isStateReset) {
      this._hasLanguageChanged = true;

      if (this._isInitialized) {
        this.removeModelListeners();

        if (this._currentPageModel) {
          // @todo: ideally this would fire before the Adapt collections have reset - not possible in earlier frameworks but might be possible in later by `listenTo('Adapt.data', 'loading')` which fires before reset
          // send experienced statement to ensure statement is sent before preferred language
          this.sendExperienced(this._currentPageModel);

          // due to models reloading `_currentPageModel` is not part of Adapt.contentObjects so the stateModel is not picking up the durations change
          Adapt.trigger('xapi:durationsChange', this._currentPageModel);

          // reset to bypass call in `onRouterLocation` so experienced statement is not sent
          this._currentPageModel = null;
        }

        // restore course session start time
        if (!isStateReset) this.setModelSessionStartTime(Adapt.course, this._courseSessionStartTime);

        // send statement if language has changed since the course was started - call in `onAdaptInitialize` is only used initially to ensure correct execution order of statements
        this.sendPreferredLanguage();
      }

      this.set('lang', lang);

      // reset course session start time if the state has been reset
      if (isStateReset) this.setModelSessionStartTime(Adapt.course);
    },

    onAdaptInitialize: function() {
      if (!this._isInitialized) {
        this.setModelSessionStartTime(Adapt.course);

        this.sendInitialized();

        // only called on initial launch if the course contains a language picker - call in `onLanguageChanged` is used for subsequent changes within the current browser session
        if (this._hasLanguageChanged) {
          this.sendPreferredLanguage();

          this._hasLanguageChanged = false;
        }
      }

      this.setupListeners();

      this._isInitialized = true;
    },

    onPageViewReady: function(view) {
      const model = view.model;

      // store model so we have a reference to existing model following a language change
      this._currentPageModel = model;

      this.setModelSessionStartTime(model);
    },

    onRouterLocation: function() {
      const previousId = Adapt.location._previousId;

      // bypass if no page model or no previous location
      if (!this._currentPageModel || !previousId) return;

      const model = Adapt.findById(previousId);

      if (model && model.get('_type') === 'page') {
        // only record experienced statements for pages
        this.sendExperienced(model);
      }

      this._currentPageModel = null;
    },

    onContentObjectComplete: function(model) {
      // since Adapt 5.5 the course model is treated as a contentObject - ignore as this is already handled by `onTrackingComplete`
      if (model.get('_type') === 'course') return;

      // @todo: if page contains an assessment which can be reset but the page completes regardless of pass/fail, the `_totalDuration` will increase cumulatively for each attempt - should we reset the duration when reset?
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
      let model;
      const assessmentConfig = Adapt.course.get('_assessment');

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
      const model = new Backbone.Model();

      model.set({
        _id: (data.type === 'document') ? data.filename : '?link=' + data._link,
        title: data.title,
        description: data.description,
        url: (data.type === 'document') ? data.filename : data._link
      });

      this.sendResourceExperienced(model);
    },

    onVisibilityChange: function() {
      // set durations to ensure State loss is minimised for durations data, if terminate didn't fire
      if (document.visibilityState === 'hidden' && !this._terminate) {
        if (this._currentPageModel) this.setModelDuration(this._currentPageModel);

        this.setModelDuration(Adapt.course);
      }
    },

    onWindowUnload: function() {
      $(window).off('beforeunload unload', this._onWindowUnload);

      if (!this._terminate) {
        Adapt.terminate = this._terminate = true;

        const model = Adapt.findById(Adapt.location._currentId);

        if (model && model.get('_type') !== 'course') {
          this.sendExperienced(model);
        }

        this.sendTerminated();
      }
    }

  });

  return StatementModel;

});
