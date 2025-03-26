import QuestionStatementModel from './QuestionStatementModel';

class TextInputStatementModel extends QuestionStatementModel {
  
  getInteractionObject(model) {
    const correctResponsesPattern = this.getCorrectResponsesPattern(model);
    if (correctResponsesPattern === null) return {};

    const definition = {
      correctResponsesPattern
    };

    return definition;
  }

  getCorrectResponsesPattern(model) {
    let correctAnswers = model.get('_answers');

    // use same assumption as component that generic answers supersede specific answers
    if (!correctAnswers) {
      const items = model.get('_items');

      // Exclude correctResponsesPattern if using specific answers when there is more than one input?
      // 'Where the criteria for a question are complex and correct responses cannot be exhaustively listed, Learning Record Providers are discouraged from using the "correctResponsesPattern" property.'
      if (items > 1) return null;

      correctAnswers = items.map(item => item._answers);
    }

    return correctAnswers.flat();
  }

}

export default TextInputStatementModel;
