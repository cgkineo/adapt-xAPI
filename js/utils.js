const Utils = {
  
  getISO8601Duration(milliseconds) {
    const centiseconds = Math.round(milliseconds / 10);
    const hours = parseInt(centiseconds / 360000, 10);
    const minutes = parseInt((centiseconds % 360000) / 6000, 10);
    const seconds = ((centiseconds % 360000) % 6000) / 100;

    let durationString = 'PT';
    if (hours > 0) durationString += hours + 'H';
    if (minutes > 0) durationString += minutes + 'M';
    durationString += seconds + 'S';

    return durationString;
  },

  getTimestamp() {
    const date = new Date();
    const ISODate = this.getISODate(date);
    const ISOTime = this.getISOTime(date);
    const ISOOffset = this.getISOOffset(date);

    return ISODate + 'T' + ISOTime + ISOOffset;
  },

  getISODate(date) {
    const year = date.getFullYear();
    const month = this.padZeros(date.getMonth() + 1);
    const monthDay = this.padZeros(date.getDate());

    return `${year}-${month}-${monthDay}`;
  },

  getISOTime(date) {
    const hours = this.padZeros(date.getHours());
    const minutes = this.padZeros(date.getMinutes());
    const seconds = this.padZeros(date.getSeconds());
    const milliseconds = this.padZeros(date.getMilliseconds());

    return `${hours}:${minutes}:${seconds}.${milliseconds}`;
  },

  getISOOffset(date) {
    const offset = date.getTimezoneOffset();

    if (offset === 0) return 'Z';

    const absOffset = Math.abs(offset);
    const offsetHours = this.padZeros(Math.floor(absOffset / 60));
    const offsetMinutes = this.padZeros(Math.floor(absOffset % 60));
    const offsetSign = offset > 0 ? '-' : '+';

    return `${offsetSign}${offsetHours}:${offsetMinutes}`;
  },

  padZeros(num) {
    return num < 10 ? '0' + num : num.toString();
  }
}

export default Utils;
