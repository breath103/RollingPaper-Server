var http 	 = require('http');
var express  = require('express');
var app      = express();
var socketIO = require('socket.io');
var io 		 = null;
var fs   	 = require('fs');
var path 	 = require("path");
var url  	 = require("url");
var net  	 = require("net");
var async    = require('async');
var vm 		 = require('vm');
var Step     = require("step");


var ntwitter = require('ntwitter');

var twit = new ntwitter({
	consumer_key: 'PBcZKteboOW8NpxYTkpA',
	consumer_secret: 'FWet4Dryc5OKWSU8WfZOaW10N7gwU19t3lSmC9HUsNQ',
	access_token_key: '185631530-RlhBEnI2kHqhMHbd6VYBKCKsyroen9IEZffki5Hw',
	access_token_secret: 'rymT07iIRvybKsNyUFMUHsitBeSGLnflN60dTNpO2w'
});


function TwitterPin(name,id,latitude,longitude){
	return {
		name : name,
		id : id,
		location : {
			latitude : latitude,
			longitude: longitude
		}
	};
}



var twittetGPSMap = [
	TwitterPin("국립극장"	  ,"ntok_",37.551382,127.000897),
	TwitterPin("세종예술회관","SEJONG_CENTER",37.57271208650189, 126.97543144226074),
	TwitterPin("코엑스"    ,"Coex_Seoul",37.511905,127.061588),
	TwitterPin("사이버코엑스","cybercoex",37.57271208650189, 126.97543144226074),
	TwitterPin("서울아트센터","I_Love_SAC",37.482487,127.014896),
	TwitterPin("서울대공원" ,"SeoulGrandPark",37.433977,127.012836),
	TwitterPin("세종예술회관","The_NMK",37.524107,126.980385)
];
var twtData = {};
	
var stepCount = twittetGPSMap.length;
twittetGPSMap.forEach(function(element){
	(function(e){
		Step(
			function(){
				twtData[e.id] = e;
				twtData[e.id].timeline = [];
				twit.getUserTimeline({screen_name : e.id},this);
			},
			function(err,data){
				if(!err){
					data.forEach(function(twt){
						console.log(twtData[e.id] , e);
						twtData[e.id].timeline.push(twt);
					});
				}
			});	
	})(element);
});


function initExpressEndSocketIO(){
	app.configure(function() {
		app.set('views', __dirname + '/views');
		app.set('view options', { layout: false });
		app.set('view engine', 'ejs');
		app.use(express.methodOverride());
		app.use(express.bodyParser());
		app.use(express.static(__dirname + '/resources'));
		app.use(app.router);
		
	});
	app.configure('production', function() {
	    app.use(express.logger());
	    app.use(express.errorHandler());      
	});
	app.configure('development', function() {
	    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
	});
	app.get('/', function(req, res) {
	    res.render('index.html', {});      
	});
	app.get('/test', function(req, res) {
		res.render('map.ejs', { twitterData: JSON.stringify(twtData)});
	});
	app.get('/game/view.html', function(req, res) {
	    res.render('view.html', {});
	});
	app.get('/game/client.html', function(req, res) {
	    res.render('client.html', {});
	});
	app = http.createServer(app).listen(8001);
	io = socketIO.listen(app);
}
initExpressEndSocketIO();




