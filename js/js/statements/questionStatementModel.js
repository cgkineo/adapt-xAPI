define([
  './abstractStatementModel'
], function(AbstractStatementModel) {

  const QuestionStatementModel = AbstractStatementModel.extend({

    getData: function(model) {
      const statement = AbstractStatementModel.prototype.getData.apply(this, arguments);
      statement.result = this.getResult(model);

      return statement;
    },

    getVerb: function(model) {
      // return ADL.verbs.answered;

      const verb = {
        id: 'http://adlnet.gov/expapi/verbs/answered',
        display: {}
      };

      verb.display[this.get('recipeLang')] = 'answered';

      return verb;
    },

    getActivityType: function(model) {
      return 'http://adlnet.gov/expapi/activities/cmi.interaction';
    },

    getObject: function(model) {
      const object = AbstractStatementModel.prototype.getObject.apply(this, arguments);

      const definition = {
        description: this.getDescription(model),
        interactionType: model.getResponseType()
      };

      _.extend(definition, this.getInteractionObject(model));
      _.extend(object.definition, definition);

      return object;
    },

    getDescription: function(model) {
      const description = {};
      description[this.get('lang')] = model.get('body');

      return description;
    },

    /*
        getInteractionActivities: function(model) {
            var activities = {
                interactionType: model.getResponseType()
            };

            _.extend(activities, this.getInteractionObject(model));

            return activities;
        },
        */

    getInteractionObject: function(model) {
      const interactionObject = model.getInteractionObject();

      for (const key in interactionObject) {
        const interactionActivity = interactionObject[key];

        interactionActivity.forEach(function(activity) {
          if (activity.hasOwnProperty('description')) {
            const description = {};
            description[this.get('lang')] = activity.description;
            activity.description = description;
          }
        }, this);
      }

      return interactionObject;
    },

    getObjectExtensions: function(model) {
      const extensions = AbstractStatementModel.prototype.getObjectExtensions.apply(this, arguments);

      _.extend(extensions, {
        'https://adaptlearning.org/xapi/extension/component': model.get('_component')
      });

      return extensions;
    },

    getContextActivities: function(model) {
      const contextActivities = AbstractStatementModel.prototype.getContextActivities.apply(this, arguments);

      if (model.get('_isPartOfAssessment')) {
        contextActivities.parent = [
          this.getAssessmentContextActivity(model)
        ];
      }

      return contextActivities;
    },

    getAssessmentContextActivity: function(model) {
      const assessment = model.findAncestor('articles');
      const object = AbstractStatementModel.prototype.getObject.call(this, assessment);
      object.definition.type = ADL.activityTypes.assessment;

      return object;
    },

    getResult: function(model) {
      const result = {
        score: {
          raw: model.get('_score') || 0/*,
                    min: 0,
                    max: model.get('_maxScore'),
                    scaled: model.get('_scoreAsPercent') / 100 */
        },
        success: model.get('_isCorrect'),
        completion: model.get('_isComplete'),
        response: this.getResponse(model)
      };

      return result;
    },

    getResponse: function(model) {
      return model.getResponse();
    }

  });

  return QuestionStatementModel;

});
