const OfflineStorageHandler = {

  // will be set to StateModel once ready - store values until then
  model: new Backbone.Model(),

  get(name) {
    switch (name.toLowerCase()) {
      case 'student':// for backwards-compatibility. learnerInfo is preferred and will give more information
        return this.model.get('actor').name;
      case 'learnerinfo':
        return this._getActorData();
      default:
        return this.model.get(name);
    }
  },

  set(name, value) {
    this.model.set(name, value);
  },

  _getActorData: function() {
    const actor = this.model.get('actor');
    const id = this._getIdFromActor(actor);

    /*
      * don't think we should make any judgement on name format for firstname or lastname, as there is no standard for this in xAPI
      * if actor.name not provided, use id IFI
      */
    return {
      id,
      name: actor.name || id
    };
  },

  _getIdFromActor(actor) {
    const { openid, mbox, mbox_sha1sum, account } = actor;
    if (openid) return openid;
    if (mbox) return mbox;
    if (mbox_sha1sum) return mbox_sha1sum;
    if (account?.homePage && account?.name) {
      return `${account.homePage}:${account.name}`;
    }
    return null;
  }

}

export default OfflineStorageHandler;
