import AbstractStatementModel from './AbstractStatementModel';
import PreferredStatementModel from './PreferredStatementModel';

class LanguageStatementModel extends PreferredStatementModel {

  getData(model, lang) {
    const statement = super.getData.apply(this, arguments);
    statement.result = this.getResult(model, lang);
    return statement;
  }

  getActivityType() {
    return ADL.activityTypes.course;
  }

  getName(model) {
    return AbstractStatementModel.prototype.getName.call(this, model);
  }

  getContextExtensions(model, lang) {
    const extensions = AbstractStatementModel.prototype.getContextExtensions.apply(this, arguments);

    Object.assign(extensions, {
      'http://id.tincanapi.com/extension/language': lang
    });

    return extensions;
  }

  getResult(model, lang) {
    const result = {
      response: lang
    };

    return result;
  }
}

export default LanguageStatementModel;
