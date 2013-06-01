// USER
module.exports = function(app) {
    console.log("       --USERS--");
	
	var user = app.mongoose.models["user"];
	app.get("/api/users.json",function(req,res){
		user.find(function(error,users){
			if(error){ res.send(500); }
			else {
				res.json(users);
			}
		});
	});

    console.log("       --USERS END--");
}