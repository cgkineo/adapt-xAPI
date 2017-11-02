define([
    'core/js/adapt',
    './questionStatementModel'
], function(Adapt, QuestionStatementModel) {

    var DELIMETER = "[,]";

    var McqStatementModel = QuestionStatementModel.extend({

        getCorrectResponsesPattern: function(model) {
            var correctItems = _.filter(model.get('_items'), function(item) {
                return item._shouldBeSelected;
            });

            var pattern = _.pluck(correctItems, 'text');

            return [
                pattern.join(DELIMETER)
            ];
        },

        getResponse: function(model) {
            var response = _.pluck(model.get('_selectedItems'), 'text');
            return response.join(DELIMETER);
        }

    });

    return McqStatementModel;

});
