import Adapt from 'core/js/adapt';
import data from 'core/js/data';
import location from 'core/js/location';
import logging from 'core/js/logging';
import OfflineQueueModel from './OfflineQueueModel';
import InitializedStatementModel from './statements/InitializedStatementModel';
import TerminatedStatementModel from './statements/TerminatedStatementModel';
import PreferredLanguageStatementModel from './statements/PreferredLanguageStatementModel';
import CompletedStatementModel from './statements/CompletedStatementModel';
import ExperiencedStatementModel from './statements/ExperiencedStatementModel';
import McqStatementModel from './statements/McqStatementModel';
import SliderStatementModel from './statements/SliderStatementModel';
import ConfidenceSliderStatementModel from './statements/ConfidenceSliderStatementModel';
import TextInputStatementModel from './statements/TextInputStatementModel';
import MatchingStatementModel from './statements/MatchingStatementModel';
import AssessmentStatementModel from './statements/AssessmentStatementModel';

class StatementModel extends Backbone.Model {

  defaults() {
    return {
      _tracking: {
        _questionInteractions: true,
        _assessmentsCompletion: false,
        _assessmentCompletion: true,
        _navbar: false,
        _visua11y: false,
        _connectionErrors: false,
        _inactivityTimout: false
      },
      xAPIWrapper: null,
      _isInitialized: false,
      _hasLanguageChanged: false,
      _courseSessionStartTime: null,
      _currentPageModel: null,
      _terminate: false
    };
  }

  initialize(attributes, options) {
    this.listenTo(Adapt, {
      'adapt:initialize': this.onAdaptInitialize,
      'xapi:languageChanged': this.onLanguageChanged
    });

    const { wrapper } = options;
    this.xAPIWrapper = wrapper;
    this._tracking = { ...this.defaults()._tracking, ...options._tracking };
    this.consecutiveFailures = 0;
    this.hasShownLRSError = false;

    this.offlineQueue = new OfflineQueueModel(options);
  }

  setupListeners() {
    this.setupModelListeners();

    // don't create new listeners for those which are still valid from initial course load
    if (this._isInitialized) return;

    this._onVisibilityChange = () => this.onVisibilityChange();
    $(document).on('visibilitychange', this._onVisibilityChange);

    this._onWindowUnload = () => this.onWindowUnload();
    $(window).on('beforeunload unload', this._onWindowUnload);

    this.listenTo(Adapt, {
      'pageView:ready': this.onPageViewReady,
      'router:location': this.onRouterLocation,
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
  }

  setupModelListeners() {
    // don't create new listeners for those which are still valid from initial course load
    if (this._isInitialized) {
      this.removeModelListeners();
    }

    this.listenTo(Adapt.contentObjects, {
      'change:_isComplete': this.onContentObjectComplete
    });

    this.listenTo(Adapt.components, {
      'change:_isComplete': this.onComponentComplete
    });
  }

  removeModelListeners() {
    this.stopListening(Adapt.contentObjects, {
      'change:_isComplete': this.onContentObjectComplete
    });

    this.stopListening(Adapt.components, {
      'change:_isComplete': this.onComponentComplete
    });
  }

  showErrorNotification() {
    // This triggers the _lrs error notification
    // Should only be called for initialization failures or complete LRS connection failures
    // Normal send failures are handled silently by the queue
    Adapt.trigger('xapi:lrsError');
  }

  sendInitialized() {
    const { attributes } = this;
    const statementModel = new InitializedStatementModel(attributes);
    const statement = statementModel.getData(Adapt.course);

    this.send(statement);
  }

  sendTerminated() {
    const model = Adapt.course;

    this.setModelDuration(model);

    const { attributes } = this;
    const statementModel = new TerminatedStatementModel(attributes);
    const statement = statementModel.getData(model);

    this._terminate = true;

    this.send(statement);
  }

  sendLanguage(lang) {
    const { attributes } = this;
    const statementModel = new PreferredLanguageStatementModel(attributes);
    const statement = statementModel.getData(Adapt.course, lang);

    this.send(statement);
  }

  sendCompleted(model, type) {
    const modelType = model.get('_type');

    if (modelType === 'course' || modelType === 'page') this.setModelDuration(model);

    const { attributes } = this;
    const statementModel = new CompletedStatementModel(attributes, { _type: type });
    const statement = statementModel.getData(model);

    this.send(statement);
  }

  sendExperienced(model) {
    this.setModelDuration(model);

    const { attributes } = this;
    const statementModel = new ExperiencedStatementModel(attributes);
    const statement = statementModel.getData(model);

    this.send(statement);
  }

  sendQuestion(model) {
    const { attributes } = this;
    const questionType = model.get('_component');

    let statementClass;

    switch (questionType) {
      case 'mcq':
        statementClass = McqStatementModel;
        break;
      case 'gmcq':
        statementClass = McqStatementModel;
        break;
      case 'slider':
        statementClass = SliderStatementModel;
        break;
      case 'confidenceslider':
        statementClass = ConfidenceSliderStatementModel;
        break;
      case 'textinput':
        statementClass = TextInputStatementModel;
        break;
      case 'matching':
        statementClass = MatchingStatementModel;
        break;
      default:
        logging.warn(`xAPI: No statement model found for question type '${questionType}'`);
        return;
    }

    const StatementClass = statementClass;
    const statementModel = new StatementClass(attributes);
    const statement = statementModel.getData(model);

    this.send(statement);
  }

  sendAssessmentCompleted(model, state) {
    const { attributes } = this;
    const statementModel = new AssessmentStatementModel(attributes);
    const statement = statementModel.getData(model, state);

    this.send(statement);
  }

  /*
   * @todo: Add Fetch API into xAPIWrapper - https://github.com/adlnet/xAPIWrapper/issues/166
   *
   * Error Handling Strategy:
   * - Statements are always attempted to be sent directly first
   * - Retry logic with configurable attempts and delays
   * - If queue is enabled: failed statements are queued silently (no error popup)
   * - If queue is disabled: shows _lrs error after 3 consecutive network failures
   * - Queue system shows _lrs error after 3 consecutive complete flush failures
   * - Opportunistically flushes queue after successful sends
   * - Network failures include: timeout, "Failed to fetch", NetworkError, AbortError
   */
  async send(statement) {
    const xapiConfig = Adapt.config.get('_xapi');
    const queueConfig = xapiConfig._offlineQueue;

    // Check and flush any queued statements first
    if (queueConfig?._isEnabled) {
      await this.offlineQueue.checkQueue();
    }

    const { lrs, xapiVersion } = this.xAPIWrapper;
    const url = `${lrs.endpoint}statements`;
    const data = JSON.stringify(statement);

    const maxRetries = queueConfig?._maxRetries || 1;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        const controller = new AbortController();
        const timeout = queueConfig?._timeout || 5000;
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          keepalive: this._terminate,
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            Authorization: lrs.auth,
            'X-Experience-API-Version': xapiVersion
          },
          body: data
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          logging.debug(`[${statement.id}]: ${response.status} - ${response.statusText}`);
          throw new Error(response.statusText);
        }

        logging.debug(`[${statement.id}]: ${response.status} - ${response.statusText}`);

        // Reset failure counter on successful send
        this.consecutiveFailures = 0;
        this.hasShownLRSError = false;

        // Opportunistic queue flush: if queue exists, try to flush it after successful send
        if (queueConfig?._isEnabled && this.offlineQueue.queue.length > 0) {
          setTimeout(() => {
            this.offlineQueue.flushQueue();
          }, 0);
        }

        return response;
      } catch (error) {
        attempt++;
        if (attempt >= maxRetries) {
          // Track consecutive failures
          const isNetworkError = !error.message || error.message.includes('NetworkError') || error.message.includes('Failed to fetch') || error.name === 'AbortError';

          if (isNetworkError) {
            this.consecutiveFailures++;
          }

          // Queue the statement if all retries failed (no notification - queue handles it)
          if (queueConfig?._isEnabled) {
            logging.debug(`[${statement.id}]: Queued after ${attempt} attempts`);
            this.offlineQueue.queueStatement(statement);
          } else {
            // Show error if queue is disabled and this is a critical failure (no response at all)
            logging.error(`[${statement.id}]: Failed to send statement - ${error.message}`);

            // Show LRS error notification after 3 consecutive network failures
            if (isNetworkError && this.consecutiveFailures >= 3 && !this.hasShownLRSError) {
              this.hasShownLRSError = true;
              this.showErrorNotification();
            }
          }
          break;
        }

        // Wait before retrying
        const retryDelay = queueConfig?._retryDelay || 2000;
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  setModelSessionStartTime(model, restoredTime) {
    const time = restoredTime || Date.now();

    model.set('_sessionStartTime', time);

    // capture start time for course session as models are reloaded on a language change
    if (model.get('_type') === 'course') this._courseSessionStartTime = time;
  }

  setModelDuration(model) {
    const startTime = model.get('_sessionStartTime');
    const duration = this.getISODuration(startTime);

    model.set('_sessionDuration', duration);
  }

  onLanguageChanged(lang, isStateReset) {
    this._hasLanguageChanged = true;

    this.sendLanguage(lang);

    if (isStateReset) {
      this.resetModels();
    }
  }

  onAdaptInitialize() {
    this.setupListeners();

    // restore _sessionStartTime for course, pages and components
    data.forEach((model) => {
      const restoredTime = model.get('_sessionStartTime');

      if (!restoredTime) {
        // @todo: issue where sessionStartTime was being restored for current page after course initialization has finished (affecting duration result). Should _sessionStartTime be deleted when not on current page?
        this.setModelSessionStartTime(model);
        return;
      }

      this.setModelSessionStartTime(model, restoredTime);
    });

    this._isInitialized = true;

    this.sendInitialized();
  }

  onVisibilityChange() {
    const isHidden = document.hidden;

    if (isHidden) return;

    const currentModel = location._currentModel;

    // @todo: capture start time for course session across language changes? Maybe not... if the language changes, they are essentially restarting their session
    if (this._hasLanguageChanged) {
      this._hasLanguageChanged = false;

      data.forEach((model) => {
        this.setModelSessionStartTime(model);
      });
    }

    if (!currentModel || !this._isInitialized) return;

    const currentPageModel = currentModel.getAncestorModels().find(ancestor => ancestor.get('_type') === 'page');

    // @todo: should we reset the _sessionStartTime when navigating forward through pages, or only when changing tabs? Not sure there is any benefit in doing the former...
    if (this._currentPageModel !== currentPageModel) {
      this._currentPageModel = currentPageModel;
      return;
    }

    this.setModelSessionStartTime(currentPageModel);
  }

  onPageViewReady(pageModel) {
    this._currentPageModel = pageModel;

    this.setModelSessionStartTime(pageModel);
  }

  onRouterLocation() {
    const currentLocation = location._currentLocation;

    if (currentLocation._contentType !== 'page' || !this._currentPageModel) return;

    this.sendExperienced(this._currentPageModel);
  }

  onWindowUnload() {
    this.sendTerminated();
  }

  onContentObjectComplete(model) {
    const completedType = model.get('_type') === 'course' ? 'course' : 'section';

    this.sendCompleted(model, completedType);
  }

  onComponentComplete(model) {
    const shouldRecordInteraction = model.get('_recordCompletion');

    if (!shouldRecordInteraction) return;

    const isQuestion = model.get('_isQuestionType');

    if (!isQuestion) {
      this.sendCompleted(model, 'activity');
      return;
    }

    this.sendQuestion(model);
  }

  onQuestionInteraction(questionView) {
    const model = questionView.model;

    this.sendQuestion(model);
  }

  onAssessmentsComplete(state) {
    const assessmentModel = state.assessments.at(state.assessmentId);
    const article = assessmentModel.getChildren().models[0];

    this.sendAssessmentCompleted(article, state);
  }

  onAssessmentComplete(state) {
    const model = Adapt.course;

    this.sendAssessmentCompleted(model, state);
  }

  onTrackingComplete() {
    const model = Adapt.course;

    this.sendCompleted(model, 'course');
  }

  resetModels() {
    data.forEach((model) => {
      this.setModelSessionStartTime(model);
    });
  }

  getISODuration(timestamp) {
    const start = new Date(timestamp);
    const finish = new Date();

    const duration = (finish.getTime() - start.getTime()) / 1000;

    return this.convertToISODuration(duration);
  }

  convertToISODuration(duration) {
    // @todo: calculate years and months - moment.js doesn't appear to handle this correctly so I'm not sure it's just a case of dividing. Also, when do we reset the timer? Surely years and months will very rarely be required?
    const days = Math.floor(duration / 86400);
    const hours = Math.floor((duration % 86400) / 3600);
    const minutes = Math.floor(((duration % 86400) % 3600) / 60);
    const seconds = Math.floor(((duration % 86400) % 3600) % 60);

    let isoDuration = 'P';

    if (days) isoDuration = `${isoDuration}${days}D`;

    isoDuration = `${isoDuration}T`;

    if (hours) isoDuration = `${isoDuration}${hours}H`;
    if (minutes) isoDuration = `${isoDuration}${minutes}M`;
    if (seconds) isoDuration = `${isoDuration}${seconds}S`;

    if (isoDuration === 'PT') isoDuration = 'PT0S';

    return isoDuration;
  }

}

export default StatementModel;
