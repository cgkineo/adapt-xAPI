define([
    './abstractStatementModel'
], function(AbstractStatementModel) {

    var PreferredStatementModel = AbstractStatementModel.extend({

        getVerb: function(model) {
            //return ADL.verbs.preferred;

            var verb = {
                id: "http://adlnet.gov/expapi/verbs/preferred",
                display: {}
            };

            verb.display[this.get('recipeLang')] = "preferred";

            return verb;
        }

    });

    return PreferredStatementModel;

});
