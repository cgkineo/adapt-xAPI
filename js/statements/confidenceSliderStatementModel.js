define([
  './sliderStatementModel'
], function(SliderStatementModel) {

  const ConfidenceSliderStatementModel = SliderStatementModel.extend({

    getResult: function(model) {
      const result = {
        completion: model.get('_isComplete'),
        response: this.getResponse(model)
      };

      return result;
    },

  });

  return ConfidenceSliderStatementModel;

});
