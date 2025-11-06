import Adapt from 'core/js/adapt';
import data from 'core/js/data';
import location from 'core/js/location';
import Utils from './Utils';
import InitializedStatementModel from './statements/InitializedStatementModel';
import TerminatedStatementModel from './statements/TerminatedStatementModel';
import LanguageStatementModel from './statements/LanguageStatementModel';
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
        _statementFailures: false
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

    // Instance Variables
    const { wrapper, _tracking } = options;
    this.xAPIWrapper = wrapper;
    this._tracking = { ...this.defaults()._tracking, ..._tracking };

    Object.assign(this._tracking, options._tracking);

    // Store debug mode flag from xAPI config root level
    const xapiConfig = Adapt.config.get('_xapi');
    this._debugModeEnabled = xapiConfig?._debugModeEnabled || false;
  }

  setupListeners() {
    this.setupModelListeners();

    // don't create new listeners for those which are still valid from initial course load
    if (this._isInitialized) return;

    this._onVisibilityChange = () => this.onVisibilityChange();
    $(document).on('visibilitychange', this._onVisibilityChange);

    this._onWindowUnload = () => this.onWindowUnload();
    $(window).on('pagehide', this._onWindowUnload);

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

    if (this._tracking._trackingErrors) {
      this.listenTo(Adapt, {
        'tracking:initializeError': this.onInitializeError,
        'tracking:dataError': this.onDataError,
        'tracking:connectionError': this.onConnectionError,
        'tracking:terminationError': this.onTerminationError
      });
    }
  }

  setupModelListeners() {
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
    Adapt.trigger('xapi:statementFailure');
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

    this.sendCriticalStatement(statement);
  }

  sendPreferredLanguage() {
    const { attributes } = this;
    const statementModel = new LanguageStatementModel(attributes);
    const statement = statementModel.getData(Adapt.course, Adapt.config.get('_activeLanguage'));

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

    model.unset('_sessionStartTime', { silent: true });
    model.unset('_sessionDuration', { silent: true });
  }

  sendQuestionAnswered(model) {
    const { attributes } = this;
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
      case 'confidenceSlider':
        statementClass = ConfidenceSliderStatementModel;
        break;
      case 'textinput':
        statementClass = TextInputStatementModel;
        break;
      case 'matching':
        statementClass = MatchingStatementModel;
        break;
    }

    const statementModel = new statementClass(attributes);
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
   */
  async send(statement) {
    const verbName = statement.verb.display.en;
    const objectName = statement.object?.definition?.name?.en || statement.object?.id || 'unknown';

    const maxRetries = 3;
    const retryDelays = [2000, 5000, 10000];
    const requestTimeout = 20000;
    let attempt = 0;

    while (attempt < maxRetries) {
      attempt++;

      try {
        const response = await this._executeFetch(statement, {
          timeout: requestTimeout
        });

        if (!response.ok) {
          const errorMsg = await this._logFetchError(null, response, verbName, objectName);
          if (this._debugModeEnabled) {
            Utils.slogf(`✗ ${verbName} | Object: ${objectName} | ${errorMsg} | Attempt ${attempt}/${maxRetries}`, 'error');
          }

          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, retryDelays[attempt - 1]));
            continue;
          }

          if (this._tracking._statementFailures) {
            this.showErrorNotification();
          }
          return false;
        }

        if (this._debugModeEnabled) {
          Utils.slogf(`✓ ${verbName} | Object: ${objectName}`, 'success');
        }
        return true;

      } catch (error) {
        const errorMsg = await this._logFetchError(error, null, verbName, objectName, true);
        if (this._debugModeEnabled) {
          Utils.slogf(`✗ ${verbName} | Object: ${objectName} | ${errorMsg} | Attempt ${attempt}/${maxRetries}`, 'error');
        }

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelays[attempt - 1]));
          continue;
        }

        if (this._tracking._statementFailures) {
          this.showErrorNotification();
        }
        return false;
      }
    }
  }

  async sendCriticalStatement(statement) {
    const verbName = statement.verb.display.en;
    const objectName = statement.object?.definition?.name?.en || statement.object?.id || 'unknown';
    const requestTimeout = 20000;

    try {
      const response = await this._executeFetch(statement, {
        isCritical: true,
        timeout: requestTimeout
      });

      if (!response.ok) {
        const errorMsg = await this._logFetchError(null, response, verbName, objectName);
        if (this._debugModeEnabled) {
          Utils.slogf(`✗ ${verbName} (critical) | Object: ${objectName} | ${errorMsg}`, 'error');
        }

        if (this._tracking._statementFailures) {
          this.showErrorNotification();
        }
        return false;
      }

      if (this._debugModeEnabled) {
        Utils.slogf(`✓ ${verbName} (critical) | Object: ${objectName}`, 'success');
      }
      return true;

    } catch (error) {
      const errorMsg = await this._logFetchError(error, null, verbName, objectName, true);
      if (this._debugModeEnabled) {
        Utils.slogf(`✗ ${verbName} (critical) | Object: ${objectName} | ${errorMsg}`, 'error');
      }

      if (this._tracking._statementFailures) {
        this.showErrorNotification();
      }
      return false;
    }
  }

  async _executeFetch(statement, options = {}) {
    const { timeout = 20000, isCritical = false } = options;
    const url = `${this.xAPIWrapper.lrs.endpoint}statements`;
    const data = JSON.stringify(statement);

    const fetchOptions = {
      method: 'POST',
      keepalive: isCritical || this._terminate,
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.xAPIWrapper.lrs.auth,
        'X-Experience-API-Version': this.xAPIWrapper.xapiVersion
      },
      body: data
    };

    // Use timeout/AbortController for standard statements
    // Note: AbortController won't work if page closes, but keepalive ensures delivery
    let controller;
    let timeoutId;

    if (timeout > 0 && !isCritical) {
      controller = new AbortController();
      fetchOptions.signal = controller.signal;
      timeoutId = setTimeout(() => controller.abort(), timeout);
    }

    try {
      const response = await fetch(url, fetchOptions);

      if (timeoutId) clearTimeout(timeoutId);

      return response;
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      throw error;
    }
  }

  async _logFetchError(error, response, verbName, objectName, isNetworkError = false) {
    if (isNetworkError) {
      return `Network error: ${error.name === 'AbortError' ? 'Timeout' : error.message}`;
    }

    if (response && !response.ok) {
      let errorDetails = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const responseText = await response.text();
        if (responseText) {
          errorDetails += ` | Response: ${responseText}`;
        }
      } catch (textError) {
        errorDetails += ' | Unable to read response body';
      }
      return errorDetails;
    }

    return error.message;
  }

  setModelSessionStartTime(model, restoredTime) {
    const time = restoredTime || Date.now();

    model.set('_sessionStartTime', time);

    // capture start time for course session as models are reloaded on a language change
    if (model.get('_type') === 'course') this._courseSessionStartTime = time;
  }

  setModelDuration(model) {
    const elapsedTime = Date.now() - model.get('_sessionStartTime');

    // reset `_sessionStartTime` to prevent cumulative additions via multiple calls to this method within the same session - mostly affects course model
    this.setModelSessionStartTime(model);

    model.set({
      _sessionDuration: (model.get('_sessionDuration') || 0) + elapsedTime,
      _totalDuration: (model.get('_totalDuration') || 0) + elapsedTime
    });
  }

  onLanguageChanged(lang, isStateReset) {
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
  }

  onAdaptInitialize() {
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
  }

  onPageViewReady(view) {
    const { model } = view;

    // store model so we have a reference to existing model following a language change
    this._currentPageModel = model;

    this.setModelSessionStartTime(model);
  }

  onRouterLocation() {
    const { _previousId: previousId } = location;

    // bypass if no page model or no previous location
    if (!this._currentPageModel || !previousId) return;

    const model = data.findById(previousId);

    if (model?.get('_type') === 'page') {
      // only record experienced statements for pages
      this.sendExperienced(model);
    }

    this._currentPageModel = null;
  }

  onContentObjectComplete(model) {
    // since Adapt 5.5 the course model is treated as a contentObject - ignore as this is already handled by `onTrackingComplete`
    if (model.get('_type') === 'course') return;

    // @todo: if page contains an assessment which can be reset but the page completes regardless of pass/fail, the `_totalDuration` will increase cumulatively for each attempt - should we reset the duration when reset?
    if (model.get('_isComplete') && !model.get('_isOptional')) {
      this.sendCompleted(model);
    }
  }

  onComponentComplete(model) {
    if (model.get('_isComplete') && model.get('_recordCompletion')) {
      this.sendCompleted(model);
    }
  }

  onAssessmentComplete(state) {
    // create model based on Adapt.course._assessment, otherwise use Adapt.course as base
    const assessmentConfig = Adapt.course.get('_assessment');
    const model = (assessmentConfig?._id && assessmentConfig?.title)
      ? new Backbone.Model(assessmentConfig)
      : Adapt.course;

    setTimeout(this.sendAssessmentCompleted.bind(this, model, state), 0);
  }

  onAssessmentsComplete(state, model) {
    // defer as triggered before last question triggers questionView:recordInteraction
    setTimeout(this.sendAssessmentCompleted.bind(this, model, state), 0);
  }

  onTrackingComplete() {
    this.sendCompleted(Adapt.course);

    // no need to use completionData.assessment due to assessment:complete listener, which isn't restricted to only firing on tracking:complete
  }

  onQuestionInteraction(view) {
    this.sendQuestionAnswered(view.model);
  }

  onInitializeError() {
    this.sendReceived('Initialization Error');
  }

  onDataError() {
    this.sendReceived('Data Error');
  }

  onConnectionError() {
    this.sendReceived('Connection Error');
  }

  onTerminationError() {
    this.sendReceived('Termination Error');
  }

  onVisibilityChange() {
    // set durations to ensure State loss is minimised for durations data, if terminate didn't fire
    if (document.visibilityState === 'hidden' && !this._terminate) {
      if (this._currentPageModel) this.setModelDuration(this._currentPageModel);

      this.setModelDuration(Adapt.course);
    }
  }

  onWindowUnload() {
    $(window).off('beforeunload unload', this._onWindowUnload);

    if (!this._terminate) {
      Adapt.terminate = this._terminate = true;

      const model = data.findById(location._currentId);

      if (model?.get('_type') !== 'course') {
        this.sendExperienced(model);
      }

      this.sendTerminated();
    }
  }
}

export default StatementModel;
