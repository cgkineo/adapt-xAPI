define([
    'core/js/adapt',
    '../utils'
], function(Adapt, Utils) {

    var AbstractStatementModel = Backbone.Model.extend({

        defaults: {
            recipeLang: "en",
            lang: "en",
            activityId: null,
            registration: null,
            revision: null,
            actor: null,
            contextActivities: {
                grouping: []
            }
        },

        getData: function(model, state) {
            var statement = new ADL.XAPIStatement();
            statement.id = ADL.ruuid();
            statement.actor = new ADL.XAPIStatement.Agent(this.get('actor'));
            statement.verb = this.getVerb(model);
            statement.object = this.getObject(model);
            statement.context = this.getContext(model, state);
            statement.timestamp = Utils.getTimestamp();

            return statement;
        },

        getVerb: function(model) {
            // intentionally empty to be overriden by subclass
        },

        getActivityType: function(model) {
            // intentionally empty to be overriden by subclass
        },

        getObject: function(model) {
            var object = new ADL.XAPIStatement.Activity(this.getUniqueIri(model));

            var definition = {
                type: this.getActivityType(model),
                name: this.getName(model)
            };

            var extensions = this.getObjectExtensions(model);

            if (!(_.isEmpty(extensions))) definition.extensions = extensions;

            object.definition = definition;

            return object;
        },

        getObjectExtensions: function(model) {
            var extensions = {};
            var type = model.get('_type');

            if (type) extensions["https://adaptlearning.org/xapi/extension/model"] = type;

            return extensions;
        },

        getContext: function(model, state) {
            var context = {
                contextActivities: this.getContextActivities(model),
                extensions: this.getContextExtensions(model, state),
                language: this.get('lang')
            };

            var registration = this.get('registration');
            if (registration) context.registration = registration;

            var revision = this.get('revision');
            if (revision) context.revision = revision;

            return context;
        },

        getContextActivities: function(model) {
            var contextActivities = _.clone(this.get('contextActivities'));
            contextActivities.grouping = this.getContextActivitiesGrouping(model);

            return contextActivities;
        },

        getContextActivitiesGrouping: function(model) {
            var grouping = this.get('contextActivities').grouping.slice();

            grouping.push(this.getCourseContextActivity());

            var modelType = model.get('_type');

            if (modelType && modelType !== "course") {
                grouping.push.apply(grouping, this.getContentObjectsContextActivities(model));
            }

            return grouping;
        },

        getCourseContextActivity: function() {
            var object = AbstractStatementModel.prototype.getObject.call(this, Adapt.course);
            object.definition.type = ADL.activityTypes.course;

            return object;
        },

        getContentObjectsContextActivities: function(model) {
            var contentObjects = model.getAncestorModels(true).filter(function(model) {
                var modelType = model.get('_type');
                var isContentObject = modelType === "menu" || modelType === "page";

                if (isContentObject) return model;
            });

            contentObjects.reverse();

            var activities = [];

            contentObjects.forEach(function(model) {
                activities.push(this.getContentObjectContextActivity(model));
            }, this);

            return activities;
        },

        getContentObjectContextActivity: function(model) {
            var modelType = model.get('_type');
            var isContentObject = modelType === "menu" || modelType === "page";
            var contentObject = (isContentObject) ? model : model.findAncestor('contentObjects');
            var object = AbstractStatementModel.prototype.getObject.call(this, contentObject);
            object.definition.type = ADL.activityTypes.module;

            return object;
        },

        getContextExtensions: function(model, state) {
            var buildConfig = Adapt.build;
            var frameworkVersion = (buildConfig) ? buildConfig.get('package').version : "<3.0.0";

            var extensions = {
                "https://adaptlearning.org/xapi/extension/framework": "Adapt",
                "https://adaptlearning.org/xapi/extension/framework_version": frameworkVersion
            };

            return extensions;
        },

        getName: function(model) {
            var name = {};
            name[this.get('lang')] = model.get('title') || model.get('displayTitle');

            return name;
        },

        getUniqueIri: function(model) {
            var iri = this.get('activityId');

            if (model && model.get('_type') !== "course") {
                iri += "/" + model.get('_id');
            }

            return iri; 
        },

        getISO8601Duration: function(milliseconds) {
            return Utils.getISO8601Duration(milliseconds);
        }

    });

    return AbstractStatementModel;

});
