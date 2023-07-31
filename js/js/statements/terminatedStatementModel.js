define([
  './abstractStatementModel'
], function(AbstractStatementModel) {

  const TerminatedStatementModel = AbstractStatementModel.extend({

    getData: function(model) {
      const statement = AbstractStatementModel.prototype.getData.apply(this, arguments);
      statement.result = this.getResult(model);

      return statement;
    },

    getVerb: function(model) {
      // return ADL.verbs.terminated;

      const verb = {
        id: 'http://adlnet.gov/expapi/verbs/terminated',
        display: {}
      };

      verb.display[this.get('recipeLang')] = 'terminated';

      return verb;
    },

    getActivityType: function(model) {
      return ADL.activityTypes.course;
    },

    getResult: function(model) {
      const result = {
        duration: this.getISO8601Duration(model.get('_sessionDuration'))
      };

      return result;
    }

  });

  return TerminatedStatementModel;

});
