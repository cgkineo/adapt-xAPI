const Utils = {

  /**
   * Converts milliseconds to ISO 8601 duration format (PTnHnMnS).
   * Used for xAPI statement durations to comply with the xAPI specification.
   * @param {number} milliseconds - The duration in milliseconds to convert
   * @returns {string} ISO 8601 duration string (e.g., "PT1H30M45.5S")
   * @example
   * Utils.getISO8601Duration(90000); // Returns "PT1M30S"
   * Utils.getISO8601Duration(3665000); // Returns "PT1H1M5S"
   */
  getISO8601Duration(milliseconds) {
    const centiseconds = Math.round(milliseconds / 10);
    const hours = Math.floor(centiseconds / 360000);
    const minutes = Math.floor((centiseconds % 360000) / 6000);
    const seconds = ((centiseconds % 360000) % 6000) / 100;

    let durationString = 'PT';
    if (hours > 0) durationString += `${hours}H`;
    if (minutes > 0) durationString += `${minutes}M`;
    durationString += `${seconds}S`;

    return durationString;
  },

  /**
   * Returns the current date/time as an ISO 8601 timestamp with timezone offset.
   * Used for xAPI statement timestamps to ensure proper chronological ordering.
   * @returns {string} ISO 8601 timestamp (e.g., "2025-11-10T14:30:25.123-05:00")
   * @example
   * Utils.getTimestamp(); // Returns "2025-11-10T14:30:25.123-05:00"
   */
  getTimestamp() {
    const date = new Date();
    const ISODate = this.getISODate(date);
    const ISOTime = this.getISOTime(date);
    const ISOOffset = this.getISOOffset(date);

    return `${ISODate}T${ISOTime}${ISOOffset}`;
  },

  /**
   * Formats a Date object as ISO 8601 date string (YYYY-MM-DD).
   * @private
   * @param {Date} date - The date object to format
   * @returns {string} ISO 8601 date string (e.g., "2025-11-10")
   */
  getISODate(date) {
    const year = date.getFullYear();
    const month = this.padZeros(date.getMonth() + 1);
    const monthDay = this.padZeros(date.getDate());

    return `${year}-${month}-${monthDay}`;
  },

  /**
   * Formats a Date object as ISO 8601 time string with milliseconds (HH:MM:SS.mmm).
   * @private
   * @param {Date} date - The date object to format
   * @returns {string} ISO 8601 time string (e.g., "14:30:25.123")
   */
  getISOTime(date) {
    const hours = this.padZeros(date.getHours());
    const minutes = this.padZeros(date.getMinutes());
    const seconds = this.padZeros(date.getSeconds());
    const milliseconds = this.padZeros(date.getMilliseconds());

    return `${hours}:${minutes}:${seconds}.${milliseconds}`;
  },

  /**
   * Formats a Date object's timezone offset as ISO 8601 format (+/-HH:MM or Z).
   * Returns 'Z' for UTC, otherwise returns offset like "+05:30" or "-08:00".
   * @private
   * @param {Date} date - The date object to get timezone offset from
   * @returns {string} ISO 8601 timezone offset (e.g., "Z", "+05:30", "-08:00")
   */
  getISOOffset(date) {
    const offset = date.getTimezoneOffset();

    if (offset === 0) return 'Z';

    const absOffset = Math.abs(offset);
    const offsetHours = this.padZeros(Math.floor(absOffset / 60));
    const offsetMinutes = this.padZeros(Math.floor(absOffset % 60));
    const offsetSign = offset > 0 ? '-' : '+';

    return `${offsetSign}${offsetHours}:${offsetMinutes}`;
  },

  /**
   * Pads single-digit numbers with leading zero for ISO 8601 formatting.
   * @private
   * @param {number} num - The number to pad
   * @returns {string} Zero-padded string (e.g., "01", "09", "10")
   */
  padZeros(num) {
    return num < 10 ? '0' + num : num.toString();
  },

  /**
   * Color-coded console logging for xAPI debugging.
   * Provides consistent, visually distinct logging for different types of xAPI events.
   * Only outputs when _debugModeEnabled is true in xAPI configuration.
   * @param {string} message - The message to log
   * @param {('success'|'error'|'queue'|'info'|'warning')} [type='info'] - The log type affecting color
   * @example
   * Utils.slogf('Statement sent successfully', 'success'); // Green text
   * Utils.slogf('Failed to send statement', 'error'); // Red bold text
   * Utils.slogf('Statement queued for retry', 'queue'); // Blue text
   */
  slogf(message, type = 'info') {
    const colors = {
      success: 'green',
      error: 'red',
      queue: 'blue',
      info: 'gray',
      warning: 'orange'
    };
    const color = colors[type] || 'gray';

    console.log(`%c[xAPI] ${message}`, `background: lightgray; color: ${color}; font-weight: ${type === 'error' ? 'bold' : 'normal'}`);
  }
};

export default Utils;
