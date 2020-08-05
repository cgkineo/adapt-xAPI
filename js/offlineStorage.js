define([
	'coreJS/adapt'
], function(Adapt) {

	var OfflineStorage = {

		// will be set to StateModel once ready - store values until then
		model: new Backbone.Model(),

		get: function(name) {
			switch (name.toLowerCase()) {
				case "student":// for backwards-compatibility. learnerInfo is preferred and will give more information
					return this.model.get('actor').name;
				case "learnerinfo":
					return this._getActorData();
				default:
					return this.model.get(name);
			}
		},

		set: function(name, value) {
			this.model.set(name, value);
		},

		_getActorData: function() {
			var actor = this.model.get('actor');
			var id = this._getIdFromActor(actor);

			/*
			 * don't think we should make any judgement on name format for firstname or lastname, as there is no standard for this in xAPI
			 * if actor.name not provided, use id IFI
			 */
			return {
				id: id,
				name: actor.name || id
			}
		},

		_getIdFromActor: function(actor) {
			var id = actor.openid;
			if (id) return id;

			id = actor.account && actor.account.name;
			if (id) return id;

			id = actor.mbox || actor.mbox_sha1sum;

			return id;
		}

	};

	return OfflineStorage;

});
