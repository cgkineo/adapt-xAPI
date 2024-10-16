import AbstractStatementModel from './AbstractStatementModel';

class AssessmentStatementModel extends AbstractStatementModel {

  getData(model, state) {
    const statement = super.getData.apply(this, arguments);
    statement.verb = this.getVerb(state);
    statement.result = this.getResult(state);

    return statement;
  }

  getVerb(state) {
    // return if using Backbone.Model from AbstractStatementModel
    if (state.attributes) return;

    const isPass = state.isPass;
    const verbType = (isPass) ? 'passed' : 'failed';

    const verb = {
      id: `http://adlnet.gov/expapi/verbs/${verbType}`,
      display: {
        [this.get('recipeLang')]: verbType
      }
    };

    return verb;
  }

  getActivityType() {
    return ADL.activityTypes.assessment;
  }

  getResult(state) {
    const result = {
      score: {
        raw: state.score,
        min: 0,
        max: state.maxScore,
        scaled: state.scoreAsPercent / 100
      }
    };

    return result;
  }
}

export default AssessmentStatementModel;
