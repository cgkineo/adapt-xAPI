define([
  './abstractStatementModel'
], function(AbstractStatementModel) {

  const ResourceItemStatementModel = AbstractStatementModel.extend({

    getVerb: function(model) {
      // return ADL.verbs.experienced;

      const verb = {
        id: 'http://adlnet.gov/expapi/verbs/experienced',
        display: {}
      };

      verb.display[this.get('recipeLang')] = 'experienced';

      return verb;
    },

    getActivityType: function(model) {
      return 'http://id.tincanapi.com/activitytype/resource';
    },

    getName: function(model) {
      const name = {};
      name[this.get('lang')] = model.get('title');

      return name;
    },

    getObject: function(model) {
      const object = AbstractStatementModel.prototype.getObject.apply(this, arguments);

      _.extend(object.definition, {
        description: this.getDescription(model),
        moreInfo: model.get('url')
      });

      return object;
    },

    getDescription: function(model) {
      const description = {};
      description[this.get('lang')] = model.get('description');

      return description;
    }

  });

  return ResourceItemStatementModel;

});
