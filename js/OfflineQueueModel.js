import Adapt from 'core/js/adapt';

class OfflineQueueModel extends Backbone.Model {

  initialize(options) {
    const xapiConfig = Adapt.config.get('_xapi');
    const isQueueEnabled = xapiConfig?._tracking?._offlineQueue?._isEnabled;

    if (!isQueueEnabled) {
      console.warn('xAPI: Offline queue is disabled in configuration. This instance should not have been created.');
      return;
    }

    this.queue = [];
    this.isSending = false;
    this.accumulatedSuccessCount = 0;
    const { wrapper } = options;
    this.xAPIWrapper = wrapper;
    this.debugMode = xapiConfig._isDebugModeEnabled;
    this.queueConfig = xapiConfig._tracking._offlineQueue;
    this.lrs = wrapper.lrs;
    this.xapiVersion = wrapper.xapiVersion;

    this.addListeners();
  }

  addListeners() {
    this.listenTo(Adapt, {
      'queue:created': this.addCreatedToQueue,
      'queue:released': this.addReleasedToQueue
    });
  }

  async checkQueue() {
    if (this.queue.length > this.queueConfig._queueThreshold) {
      await this.flushQueue('batch');
      return true;
    }
    return true;
  }

  queueStatement(statement) {
    if (this.queue.length === 0) {
      Adapt.trigger('queue:create');
    }
    this.queue.push(statement);
    if (this.debugMode) {
      const verbName = statement.verb.display.en;
      const objectName = statement.object?.definition?.name?.en || statement.object?.id || 'unknown';
      this.slogf(`Queued: ${verbName} | Object: ${objectName}`, 'queue');
      this.logQueue();
    }
  }

  async flushQueue(reason, options = {}) {
    const { force = false } = options;

    if (this.isSending) return;
    if (!force && this.queue.length <= this.queueConfig._queueThreshold) return;
    if (this.queue.length === 0) return;

    this.isSending = true;

    const statementsToFlush = [...this.queue];
    this.queue = [];

    const failedStatements = [];
    let successCount = 0;

    if (this.debugMode) {
      this.slogf(`Starting queue flush: ${statementsToFlush.length} statement${statementsToFlush.length !== 1 ? 's' : ''} to send`, 'queue');
    }

    for (const statement of statementsToFlush) {
      const verbName = statement.verb.display.en;
      const objectName = statement.object?.definition?.name?.en || statement.object?.id || 'unknown';

      try {
        const success = await this.send(statement, { reason });
        if (success) {
          if (this.debugMode) {
            this.slogf(`✓ ${verbName} | Object: ${objectName}`, 'success');
          }
          successCount++;
        } else {
          failedStatements.push(statement);
        }
      } catch (error) {
        if (this.debugMode) {
          const errorType = error.name === 'AbortError' ? 'Timeout' : error.message;
          this.slogf(`✗ ${verbName} | Object: ${objectName} | ${errorType} | Will retry later`, 'error');
        }
        failedStatements.push(statement);
      }

      await new Promise(resolve => setTimeout(resolve, 200));
    }

    this.queue = [...failedStatements, ...this.queue];

    this.accumulatedSuccessCount += successCount;

    this.isSending = false;

    if (this.debugMode) {
      if (failedStatements.length === 0 && successCount > 0) {
        this.slogf(`✓ Queue flush complete: All ${successCount} statement${successCount !== 1 ? 's' : ''} sent successfully | Queue now empty`, 'success');
        if (this.accumulatedSuccessCount > 0) {
          this.slogf(`✓ Releasing ${this.accumulatedSuccessCount} total statement${this.accumulatedSuccessCount !== 1 ? 's' : ''} (accumulated across all flush attempts)`, 'success');
        }
      } else if (successCount > 0 && failedStatements.length > 0) {
        this.slogf(`Partial flush: ${successCount}/${statementsToFlush.length} sent, ${failedStatements.length} re-queued for retry`, 'queue');
        this.logQueue();
      } else if (successCount === 0 && failedStatements.length > 0) {
        this.slogf(`✗ Queue flush failed: 0/${statementsToFlush.length} sent, all ${failedStatements.length} statements re-queued | LRS may be unreachable`, 'error');
        this.logQueue();
      }
    }

    if (failedStatements.length === 0 && this.accumulatedSuccessCount > 0) {
      const releaseReason = reason || 'batch';
      Adapt.trigger('queue:release', this.accumulatedSuccessCount, releaseReason);
      this.accumulatedSuccessCount = 0;
    }
  }

  async send(statement, options = {}) {
    const { reason, retryAttempt = 0 } = options;
    const url = `${this.lrs.endpoint}statements`;
    const data = JSON.stringify(statement);
    const verbName = statement.verb.display.en;
    const objectName = statement.object?.definition?.name?.en || statement.object?.id || 'unknown';
    const isCritical = statement._isCritical || reason === 'critical' || reason === 'unload';

    const queueFlushTimeout = this.queueConfig._queueFlushTimeout || 10000;
    const timeout = isCritical ? this.queueConfig._requestTimeout : queueFlushTimeout;

    const fetchOptions = {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.lrs.auth,
        'X-Experience-API-Version': this.xapiVersion
      },
      body: data
    };

    // Use timeout/AbortController for error detection
    // Note: AbortController won't work if page closes, but keepalive ensures delivery
    let controller;
    let timeoutId;

    if (timeout > 0) {
      controller = new AbortController();
      fetchOptions.signal = controller.signal;
      timeoutId = setTimeout(() => controller.abort(), timeout);
    }

    try {
      const response = await fetch(url, fetchOptions);

      if (timeoutId) clearTimeout(timeoutId);

      if (!response.ok) {
        if (this.debugMode) {
          const errorMsg = await this.logFetchError(null, response, verbName, objectName);
          this.slogf(`✗ ${verbName} | Object: ${objectName} | ${errorMsg} | Will retry later`, 'error');
        }

        if (retryAttempt === 0 && (response.status === 429 || response.status >= 500)) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          return this.send(statement, { reason, retryAttempt: 1 });
        }

        return false;
      }

      return true;
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      if (this.debugMode) {
        const errorMsg = await this.logFetchError(error, null, verbName, objectName, true);
        this.slogf(`✗ ${verbName} | Object: ${objectName} | ${errorMsg} | Will retry later`, 'error');
      }

      if (retryAttempt === 0) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.send(statement, { reason, retryAttempt: 1 });
      }

      return false;
    }
  }

  async logFetchError(error, response, verbName, objectName, isNetworkError = false) {
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

  addCreatedToQueue(statement) {
    this.queue.unshift(statement);
  }

  addReleasedToQueue(statement) {
    this.send(statement, { reason: 'release' });
  }

  logQueue() {
    if (!this.debugMode || this.queue.length === 0) return;
    const verbs = this.queue.map(s => s.verb.display.en).join(', ');
    this.slogf(`Queue (${this.queue.length}): [${verbs}]`, 'queue');
  }

  slogf(message, type = 'info') {
    const colors = {
      success: 'green',
      error: 'red',
      queue: 'blue',
      info: 'green'
    };
    const color = colors[type] || 'green';

    console.log(`%c [xAPI] ${message}`, `background: lightgray; color: ${color}`);
  }
}

export default OfflineQueueModel;
