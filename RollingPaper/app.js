
/**
 * Module dependencies.
 */
var express = require('express'),
	   http = require('http'),
	   path = require('path')
	  
var app = express();

app.configure(function(){
	app.set('port', 8001);
	app.set('views', __dirname + '/views');
	app.set('view engine', 'ejs');
	app.use(express.favicon());
	app.use(express.logger('dev'));
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(app.router);
	app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  	app.use(express.errorHandler());
});

app.get("/",function(req,res){
	res.send(200,"RollingPaper");
});

app.mongoose = require("./model");

require("./routes")(app);


http.createServer(app).listen(app.get('port'), function(){
  	console.log("Express server listening on port " + app.get('port'));
});

module.exports = app;