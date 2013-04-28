var util = require("util");
module.exports = function(app) {
    console.log("       --USERS--");

    var User = app.db.models.User;
    var Content = 
    
    User.checkAuth = function(req,res,next) {
        if(req.session.user){
            next();
        }
        else{
            res.redirect('/auth/login');
        }
    };
    
    app.get("/login",function(req,res,next){
        res.render("login",{});
    });
    
    app.post("/login", function(req, res, next) {
        var user = req.body.user;
        User.findOne({where : user}, function(err, user) {
            if (err || !user) {
                res.redirect("/login");
            }
            else {
	        	req.session.user = user;
	        	res.redirect("/" + user.name);
            }
        });
    });
    
    app.get("/users/signup",function(req,res){
        res.render("user/create");
    });

    app.post("/users", function(req, res, next) {
        var newUser = req.body.user;
        console.log(newUser);
        User.create(newUser,function (err,user) {
        	if(err) {
	    		next(err);    	
        	}else {
	    		res.json(user);
			}
		});
    });
    

    // users/:name/* sub routes allways has a user
    app.get("/users/:name/*",function(req,res,next){
    	console.log("!");
    	User.findOne({ where : {name : req.param("name") }} ,function(err,user) { 
	    	if(err) next(err);
	    	else {
	    		if(user){
		    		req.user = user;
		    		next();	
	    		}else{
		    		next("route");
		    		//next(new Error("no user with name : " + req.param("name")));
	    		}
	    	}
    	});
    });
    
    app.get("/users/:name",function(req,res,next){
    	if(req.user){
	    	res.render("user/show",{
       	    	user : req.user || req.session.user
       	    }); 	
    	}
    	else{
	    	next("route");
    	}
    });
    
    app.get("/users/:name/contents",function(req,res){
    	req.user.contents(function(err,contents) { 
	   		if(err) next(err);
	   		else{
		   		res.render("user/contents",{
		        	"user" : req.user,
		        	"contents" : contents
		        });
	   		} 	
    	});
    });

    console.log("       --USERS END--");
}