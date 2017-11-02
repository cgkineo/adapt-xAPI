define([
    'core/js/adapt',
    './questionStatementModel'
], function(Adapt, QuestionStatementModel) {

    var ITEM_DELIMETER = "[.]";
    var PAIR_DELIMETER = "[,]";

    var MatchingStatementModel = QuestionStatementModel.extend({

        getCorrectResponsesPattern: function(model) {
            var pattern = [];

            _.each(model.get('_items'), function(item) {
                var correctOption = _.findWhere(item._options, {'_isCorrect': true});
                pattern.push(item.text + ITEM_DELIMETER + correctOption.text)
            });

            return [
                pattern.join(PAIR_DELIMETER)
            ];
        },

        getResponse: function(model) {
            var response = [];

            _.each(model.get('_items'), function(item) {
                var option = _.findWhere(item._options, {'_isSelected': true});
                response.push(item.text + ITEM_DELIMETER + option.text)
            });

            return response.join(PAIR_DELIMETER);
        }

    });

    return MatchingStatementModel;

});
