import AbstractStatementModel from './abstractStatementModel';

class QuestionStatementModel extends AbstractStatementModel {

  getData(model) {
    const statement = super.getData.apply(this, arguments);
    statement.result = this.getResult(model);

    return statement;
  }

  getVerb(model) {
    const verb = {
      id: 'http://adlnet.gov/expapi/verbs/answered',
      display: {}
    };

    verb.display[this.get('recipeLang')] = 'answered';

    return verb;
  }

  getActivityType(model) {
    return 'http://adlnet.gov/expapi/activities/cmi.interaction';
  }

  getObject(model) {
    const object = super.getObject.apply(this, arguments);

    const definition = {
      description: this.getDescription(model),
      interactionType: model.getResponseType()
    };

    Object.assign(definition, this.getInteractionObject(model));
    Object.assign(object.definition, definition);

    return object;
  }

  getDescription(model) {
    const description = {};
    description[this.get('lang')] = model.get('body');

    return description;
  }

  getInteractionObject(model) {
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
  }

  getObjectExtensions(model) {
    const extensions = super.getObjectExtensions.apply(this, arguments);

    Object.assign(extensions, {
      'https://adaptlearning.org/xapi/extension/component': model.get('_component')
    });

    return extensions;
  }

  getContextActivities(model) {
    const contextActivities = super.getContextActivities.apply(this, arguments);

    if (model.get('_isPartOfAssessment')) {
      contextActivities.parent = [
        this.getAssessmentContextActivity(model)
      ];
    }

    return contextActivities;
  }

  getContextExtensions(model) {
    const extensions = super.getObjectExtensions.apply(this, arguments);

    Object.assign(extensions, {
      'http://id.tincanapi.com/extension/attempt-id': this.getAttempt(model)
    });

    return extensions;
  }

  getAssessmentContextActivity(model) {
    const assessment = model.findAncestor('articles');
    const object = super.getObject.call(this, assessment);
    object.definition.type = ADL.activityTypes.assessment;

    return object;
  }

  getResult(model) {
    const result = {
      score: {
        raw: model.get('_score') || 0
      },
      success: model.get('_isCorrect'),
      completion: model.get('_isComplete'),
      response: this.getResponse(model)
    };

    return result;
  }

  getResponse(model) {
    return model.getResponse();
  }

  getAttempt(model) {
    return model.get('_attempts') - model.get('_attemptsLeft');
  }
  
}

export default QuestionStatementModel;
