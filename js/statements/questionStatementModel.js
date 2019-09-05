define([
    'core/js/adapt',
    './abstractStatementModel'
], function(Adapt, AbstractStatementModel) {

    var QuestionStatementModel = AbstractStatementModel.extend({

        getData: function(view) {
            var model = view.model;

            var statement = AbstractStatementModel.prototype.getData.call(this, model, view);
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

        getObject: function(model, view) {
            var object = AbstractStatementModel.prototype.getObject.call(this, model);

            if (view) {
                _.extend(object.definition, {
                    description: this.getDescription(model),
                    interactionType: view.getResponseType(),
                    correctResponsesPattern: this.getCorrectResponsesPattern(model)
                });
            }

            return object;
        },

        getDescription: function(model) {
            var description = {};
            description[this.get('lang')] = model.get('body');

            return description;
        },

        getCorrectResponsesPattern: function(model) {
            // intentionally empty to be overriden by subclass
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
            // intentionally empty to be overriden by subclass
        }

    });

    return QuestionStatementModel;

});
