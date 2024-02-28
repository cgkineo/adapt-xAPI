import QuestionStatementModel from './questionStatementModel';

class MatchingStatementModel extends QuestionStatementModel {

  /*
    getInteractionObject(model) {
      var interactionObject = model.getInteractionObject();

      var definition = {
        source: this.getSource(interactionObject.source),
        target: this.getTarget(interactionObject.target),
        correctResponsesPattern: interactionObject.correctResponsesPattern
      };

      return definition;
    }

    getSource(sources) {
      sources.forEach(function(source) {
        var description = {};
        description[this.get('lang')] = source.description;
        source.description = description;
      }, this);

      return sources;
    }

    getTarget(targets) {
      targets.forEach(function(target) {
        var description = {};
        description[this.get('lang')] = target.description;
        target.description = description;
      }, this);

      return targets;
    }
  */

  getResponse(model) {
    return model.getResponse().replace(/\./g, ITEM_DELIMETER).replace(/,|#/g, PAIR_DELIMETER);
  }
  
}

export default MatchingStatementModel;


define([
  './questionStatementModel'
], function(QuestionStatementModel) {

  const ITEM_DELIMETER = '[.]';
  const PAIR_DELIMETER = '[,]';

  const MatchingStatementModel = QuestionStatementModel.extend({

    /*
        getInteractionObject: function(model) {
            var interactionObject = model.getInteractionObject();

            var definition = {
                source: this.getSource(interactionObject.source),
                target: this.getTarget(interactionObject.target),
                correctResponsesPattern: interactionObject.correctResponsesPattern
            };

            return definition;
        },

        getSource: function(sources) {
            sources.forEach(function(source) {
                var description = {};
                description[this.get('lang')] = source.description;
                source.description = description;
            }, this);

            return sources;
        },

        getTarget: function(targets) {
            targets.forEach(function(target) {
                var description = {};
                description[this.get('lang')] = target.description;
                target.description = description;
            }, this);

            return targets;
        },
        */

    getResponse: function(model) {
      return model.getResponse().replace(/\./g, ITEM_DELIMETER).replace(/,|#/g, PAIR_DELIMETER);
    }

  });

  return MatchingStatementModel;

});
