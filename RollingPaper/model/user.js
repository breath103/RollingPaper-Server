var validate = require('mongoose-validator').validate;

module.exports = function(mongoose){
	var Schema = mongoose.Schema;
	var User = new Schema({
		idx  	 : { type: Schema.ObjectId},
		name 	 : { type: String, required: true},
		email	 : { type: String, 
					 validate : [validate("isEmail")] },
		picture  : { type: String },
		birthday : { type: Date, required: true },
		password : { type: String, required: true },
		phone 	 : { type: String },
		facebook_id : {type : String},
		facebook_accesstoken : {type : String}
	});
	User = mongoose.model("user",User);
	
	return User;
}
