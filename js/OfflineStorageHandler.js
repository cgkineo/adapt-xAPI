const OfflineStorageHandler = {

  // will be set to StateModel once ready - store values until then
  model: new Backbone.Model(),

  get(name) {
    if (!name) return this.model.attributes;

    switch (name.toLowerCase()) {
      case 'student': {
        const actor = this.model.get('actor');
        return actor && actor.name ? actor.name : 'Unknown';
      }
      case 'learnerinfo':
        return this._getActorData();
      default:
        return this.model.get(name);
    }
  },

  set(name, value) {
    this.model.set(name, value);
  },

  _getActorData() {
    const actor = this.model.get('actor');

    // Safety check: if actor is not available yet
    if (!actor) {
      return {
        id: 'unknown',
        name: 'Unknown User'
      };
    }

    const id = this._getIdFromActor(actor);

    /*
      * don't think we should make any judgement on name format for firstname or lastname, as there is no standard for this in xAPI
      * if actor.name not provided, use id IFI
      */
    return {
      id: id || 'unknown',
      name: actor.name || id || 'Unknown User'
    };
  },

  _getIdFromActor(actor) {
    const openid = actor.openid;
    const mbox = actor.mbox;
    const mboxSha1sum = actor.mbox_sha1sum;
    const account = actor.account;

    if (openid) return openid;
    if (mbox) return mbox;
    if (mboxSha1sum) return mboxSha1sum;
    if (account && account.homePage && account.name) {
      return account.homePage + ':' + account.name;
    }
    return null;
  }

};

export default OfflineStorageHandler;
