define(function() {

    var Utils = {

        getISO8601Duration: function(milliseconds) {
            var centiseconds = Math.round(milliseconds / 10);
            var hours = parseInt(centiseconds / 360000, 10);
            var minutes = parseInt((centiseconds % 360000) / 6000, 10);
            var seconds = ((centiseconds % 360000) % 6000) / 100;

            var durationString = "PT";
            if (hours > 0) durationString += hours + "H";
            if (minutes > 0) durationString += minutes + "M"; 
            durationString += seconds + "S";

            return durationString;
        },

        getTimestamp: function() {
            var date = new Date();
            var ISODate = this.getISODate(date);
            var ISOTime = this.getISOTime(date);
            var ISOOffset = this.getISOOffset(date);

            return ISODate + "T" + ISOTime + ISOOffset;
        },

        getISODate: function(date) {
            var year = date.getFullYear();
            var month = this.padZeros(date.getMonth() + 1);
            var monthDay = this.padZeros(date.getDate());

            return year + "-" + month + "-" + monthDay;
        },

        getISOTime: function(date) {
            var hours = this.padZeros(date.getHours());
            var minutes = this.padZeros(date.getMinutes());
            var seconds = this.padZeros(date.getSeconds());
            var milliseconds = this.padZeros(date.getMilliseconds());

            return hours + ":" + minutes + ":" + seconds + "." + milliseconds;
        },

        getISOOffset: function(date) {
            var offset = date.getTimezoneOffset();

            if (offset === 0) return "Z";

            var absOffset = Math.abs(offset);
            var offsetHours = this.padZeros(Math.floor(absOffset / 60));
            var offsetMinutes = this.padZeros(Math.floor(absOffset % 60));
            var offsetSign = offset > 0 ? "-" : "+";

            return offsetSign + offsetHours + ":" + offsetMinutes;
        },

        padZeros: function(num) {
            return num < 10 ? "0" + num : num.toString();
        }

    }

    return Utils;

});
