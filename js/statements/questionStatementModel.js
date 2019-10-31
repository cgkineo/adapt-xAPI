define([
    './abstractStatementModel'
], function(AbstractStatementModel) {

    var QuestionStatementModel = AbstractStatementModel.extend({

        getData: function(model) {
            var statement = AbstractStatementModel.prototype.getData.apply(this, arguments);
            statement.result = this.getResult(model);
            
            return statement;
        },

        getVerb: function(model) {
            //return ADL.verbs.answered;

            var verb = {
                id: "http://adlnet.gov/expapi/verbs/answered",
                display: {}
            };

            verb.display[this.get('recipeLang')] = "answered";

            return verb;
        },

        getActivityType: function(model) {
            return "http://adlnet.gov/expapi/activities/cmi.interaction";
        },

        getObject: function(model) {
            var object = AbstractStatementModel.prototype.getObject.apply(this, arguments);

            var definition = {
                description: this.getDescription(model),
                interactionType: model.getResponseType()
            };

            _.extend(definition, this.getInteractionObject(model));
            _.extend(object.definition, definition);

            return object;
        },

        getDescription: function(model) {
            var description = {};
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
            var interactionObject = model.getInteractionObject();

            for (key in interactionObject) {
                var interactionActivity = interactionObject[key];

                interactionActivity.forEach(function(activity) {
                    if (activity.hasOwnProperty('description')) {
                        var description = {};
                        description[this.get('lang')] = activity.description;
                        activity.description = description;
                    }
                }, this);
            }

            return interactionObject;
        },

        getObjectExtensions: function(model) {
            var extensions = AbstractStatementModel.prototype.getObjectExtensions.apply(this, arguments);

            _.extend(extensions, {
                "https://adaptlearning.org/xapi/extension/component": model.get('_component')
            });

            return extensions;
        },

        getContextActivities: function(model) {
            var contextActivities = AbstractStatementModel.prototype.getContextActivities.apply(this, arguments);
            
            if (model.get('_isPartOfAssessment')) {
                contextActivities.parent = [
                    this.getAssessmentContextActivity(model)
                ];
            }

            return contextActivities;
        },

        getAssessmentContextActivity: function(model) {
            var assessment = model.findAncestor('articles');
            var object = AbstractStatementModel.prototype.getObject.call(this, assessment);
            object.definition.type = ADL.activityTypes.assessment;

            return object;
        },

        getResult: function(model) {
            var result = {
                score: {
                    raw: model.get('_score') || 0/*,
                    min: 0,
                    max: model.get('_maxScore'),
                    scaled: model.get('_scoreAsPercent') / 100*/
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
