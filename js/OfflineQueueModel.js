import Adapt from 'core/js/adapt';

class OfflineQueueModel extends Backbone.Model {

  initialize(options) {
    this.queue = [];
    this.isSending = false;
    this.accumulatedSuccessCount = 0;
    this.consecutiveFailures = 0;
    this.hasShownLRSError = false;
    const { wrapper } = options;
    this.xAPIWrapper = wrapper;
    const xapiConfig = Adapt.config.get('_xapi');
    this.debugMode = xapiConfig._isDebugModeEnabled;
    this.queueConfig = xapiConfig._offlineQueue || {};

    this.addListeners();
  }

  addListeners() {
    this.listenTo(Adapt, {
      'queue:created': this.addCreatedToQueue,
      'queue:released': this.addReleasedToQueue
    });
  }

  async checkQueue() {
    const threshold = this.queueConfig._queueThreshold || 5;
    if (this.queue.length > threshold) {
      await this.flushQueue('batch');
    } else {
      return true;
    }
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
    const threshold = this.queueConfig._queueThreshold || 5;

    if (this.isSending) return;
    if (!force && this.queue.length <= threshold) return;
    if (this.queue.length === 0) return;

    this.isSending = true;

    const queueLength = this.queue.length;
    const failedStatements = [];
    let successCount = 0;

    if (this.debugMode) {
      this.slogf(`Starting queue flush: ${queueLength} statement${queueLength !== 1 ? 's' : ''} to send`, 'queue');
    }

    while (this.queue.length > 0) {
      const statement = this.queue[0];
      const verbName = statement.verb.display.en;
      const objectName = statement.object?.definition?.name?.en || statement.object?.id || 'unknown';

      try {
        const success = await this.send(statement, { reason });
        if (success) {
          if (this.debugMode) {
            this.slogf(`✓ ${verbName} | Object: ${objectName}`, 'success');
          }
          this.queue.shift();
          successCount++;
        } else {
          failedStatements.push(this.queue.shift());
        }
      } catch (error) {
        if (this.debugMode) {
          const errorType = error.name === 'AbortError' ? 'Timeout' : error.message;
          this.slogf(`✗ ${verbName} | Object: ${objectName} | ${errorType} | Will retry later`, 'error');
        }
        failedStatements.push(this.queue.shift());
      }

      if (this.queue.length > 0 || failedStatements.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    this.queue = [...failedStatements, ...this.queue];

    this.accumulatedSuccessCount += successCount;

    // Track consecutive failures for LRS error notification
    if (failedStatements.length > 0 && successCount === 0) {
      this.consecutiveFailures++;
      // Show LRS error after 3 consecutive complete failures (all statements failed)
      if (this.consecutiveFailures >= 3 && !this.hasShownLRSError) {
        this.hasShownLRSError = true;
        Adapt.trigger('xapi:lrsError');
        if (this.debugMode) {
          this.slogf('✗ LRS appears completely unreachable - showing error notification', 'error');
        }
      }
    } else if (successCount > 0) {
      // Reset failure counter on any success
      this.consecutiveFailures = 0;
      this.hasShownLRSError = false;
    }

    this.isSending = false;

    if (this.debugMode) {
      if (failedStatements.length === 0 && successCount > 0) {
        this.slogf(`✓ Queue flush complete: All ${successCount} statement${successCount !== 1 ? 's' : ''} sent successfully | Queue now empty`, 'success');
        if (this.accumulatedSuccessCount > 0) {
          this.slogf(`✓ Releasing ${this.accumulatedSuccessCount} total statement${this.accumulatedSuccessCount !== 1 ? 's' : ''} (accumulated across all flush attempts)`, 'success');
        }
      } else if (successCount > 0 && failedStatements.length > 0) {
        this.slogf(`Partial flush: ${successCount}/${queueLength} sent, ${failedStatements.length} re-queued for retry`, 'queue');
        this.logQueue();
      } else if (successCount === 0 && failedStatements.length > 0) {
        this.slogf(`✗ Queue flush failed: 0/${queueLength} sent, all ${failedStatements.length} statements re-queued | LRS may be unreachable`, 'error');
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
    const { lrs, xapiVersion } = this.xAPIWrapper;
    const url = `${lrs.endpoint}statements`;
    const data = JSON.stringify(statement);
    const verbName = statement.verb.display.en;
    const objectName = statement.object?.definition?.name?.en || statement.object?.id || 'unknown';
    const isCritical = statement._isCritical || reason === 'critical' || reason === 'unload';

    const queueFlushTimeout = this.queueConfig._queueFlushTimeout || 10000;
    const timeout = isCritical ? (this.queueConfig._requestTimeout || 20000) : queueFlushTimeout;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        keepalive: isCritical,
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
        if (this.debugMode) {
          this.slogf(`✗ ${verbName} | Object: ${objectName} | HTTP ${response.status}: ${response.statusText} | Will retry later`, 'error');
        }

        if (retryAttempt === 0 && (response.status === 429 || response.status >= 500)) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          return this.send(statement, { reason, retryAttempt: 1 });
        }

        return false;
      }

      return true;
    } catch (error) {
      clearTimeout(timeoutId);
      if (this.debugMode) {
        const errorType = error.name === 'AbortError' ? 'Timeout' : error.message;
        this.slogf(`✗ ${verbName} | Object: ${objectName} | ${errorType} | Will retry later`, 'error');
      }

      if (retryAttempt === 0) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.send(statement, { reason, retryAttempt: 1 });
      }

      return false;
    }
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
