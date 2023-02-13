define([
  './abstractStatementModel'
], function(AbstractStatementModel) {

  const FavouriteStatementModel = AbstractStatementModel.extend({

    getVerb: function(model) {
      const verb = {
        id: 'http://activitystrea.ms/schema/1.0/favorite',
        display: {}
      };

      verb.display[this.get('recipeLang')] = 'favorite';

      return verb;
    },

    getActivityType: function(model) {
      return ADL.activityTypes.module;
    }

  });

  return FavouriteStatementModel;

});
