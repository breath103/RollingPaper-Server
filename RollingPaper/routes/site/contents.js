var util = require("util");
module.exports = function(app) {
    console.log("       --Contents--");


    var Content = app.db.models.Content;
    

    function getContentMiddleware(req,res,next){
    	Content.findOne({ where : {name : req.param("name") }} ,function(err,content) { 
	    	if(err) next(err);
	    	else {
	    		if(content){
		    		req.content = content;
		    		console.log("+++++",content);
		    		next();	
	    		}else{
		    		next(new Error("no content with name : " + req.param("name")));
	    		}
	    	}
    	});
    }

    // show Contents list
    app.get("/contents",function(req,res,next){
    	Content.all(function(err,contents) { 
	    	if(err) next(err);
	    	else {
	    		res.render("contents/list",{contents: contents});
	    	}
    	});
    });


    // Middleware mapping
    app.get("/contents/:name",getContentMiddleware);
    app.get("/contents/:name/*",getContentMiddleware);
    
    
    // show Content Summary
    app.get("/contents/:name/",function(req,res,next){
    	/*
    	res.render("contents/show",{
    		content : req.content
    	});
    	*/
    	res.render(util.format("contents/%s/index",req.content.name),{
    		content : req.content
    	});
    });
    
    
    console.log("       --Contents END--");
}