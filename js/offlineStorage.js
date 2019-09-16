define([
	'coreJS/adapt'
], function(Adapt) {

	var OfflineStorage = {

		// will be set to StateModel once ready - store values until then
		model: new Backbone.Model(),

		get: function(name) {
			return this.model.get(name);
		},

		set: function(name, value) {
			this.model.set(name, value);
		}

	};

	return OfflineStorage;

});
