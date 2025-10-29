import AbstractStatementModel from './AbstractStatementModel';

class QuestionStatementModel extends AbstractStatementModel {

  getData(model) {
    const statement = super.getData.apply(this, arguments);
    statement.result = this.getResult(model);

    return statement;
  }

  getVerb() {
    const verb = {
      id: 'http://adlnet.gov/expapi/verbs/answered',
      display: {
        [this.get('recipeLang')]: 'answered'
      }
    };

    return verb;
  }

  getActivityType() {
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
    const descriptionSelector = model.get('ariaQuestion') ? model.get('ariaQuestion') : model.get('body');
    description[this.get('lang')] = descriptionSelector;

    return description;
  }

  getInteractionObject(model) {
    const interactionObject = model.getInteractionObject();

    for (const key in interactionObject) {
      const interactionActivity = interactionObject[key];

      interactionActivity.forEach((activity) => {
        if (Object.prototype.hasOwnProperty.call(activity, 'description')) {
          const description = {};
          description[this.get('lang')] = activity.description;
          activity.description = description;
        }
      });
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
