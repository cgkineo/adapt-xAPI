define([
	'coreJS/adapt'
], function(Adapt) {

	var OfflineStorage = {

		stateModel: null,

		initialize: function(stateModel) {
			this.stateModel = stateModel;
		},

		get: function(name) {
			switch (name.toLowerCase()) {
				case "location":
					return this.stateModel.get('location');
				case "filtermenu":
					return this.stateModel.get('filterMenu');
				/*
				case "student":// for backwards-compatibility. learnerInfo is preferred now and will give you more information
					return scorm.getStudentName();
				case "learnerinfo":
					return this.getLearnerInfo();
				*/
			}
		},

		set: function(name, value) {
			switch (name.toLowerCase()) {
				case "location":
					this.stateModel.setLocation(value);
					break;
				case "filtermenu":
					this.stateModel.setFilterMenu(value);
					break;
			}
		}

	};

	return OfflineStorage;

});
