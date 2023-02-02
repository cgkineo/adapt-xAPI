define([
  './abstractStatementModel'
], function(AbstractStatementModel) {

  const CompletedStatementModel = AbstractStatementModel.extend({

    getData: function(model) {
      const statement = AbstractStatementModel.prototype.getData.apply(this, arguments);

      const modelType = model.get('_type');
      if (modelType === 'course' || modelType === 'page') statement.result = this.getResult(model);

      return statement;
    },

    getVerb: function(model) {
      // return ADL.verbs.completed;

      const verb = {
        id: 'http://adlnet.gov/expapi/verbs/completed',
        display: {}
      };

      verb.display[this.get('recipeLang')] = 'completed';

      return verb;
    },

    getActivityType: function(model) {
      const modelType = model.get('_type');

      switch (modelType) {
        case 'course':
          return ADL.activityTypes.course;
        case 'page':
          return ADL.activityTypes.module;
        case 'component':
          return ADL.activityTypes.interaction;
      }
    },

    getResult: function(model) {
      const result = {
        duration: this.getISO8601Duration(model.get('_totalDuration'))
      };

      return result;
    }

  });

  return CompletedStatementModel;

});
