define([
  './abstractStatementModel'
], function(AbstractStatementModel) {

  const PreferredStatementModel = AbstractStatementModel.extend({

    getVerb: function(model) {
      // return ADL.verbs.preferred;

      const verb = {
        id: 'http://adlnet.gov/expapi/verbs/preferred',
        display: {}
      };

      verb.display[this.get('recipeLang')] = 'preferred';

      return verb;
    }

  });

  return PreferredStatementModel;

});
