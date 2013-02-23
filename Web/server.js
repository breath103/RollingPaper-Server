var http 	= require('http');
var express = require('express');
var fs = require('fs');
var path = require("path");
var url = require("url");
var net = require("net");
var async = require('async');
var vm = require('vm');
var util = require("util");
var Step = require("step");
var facebook = require('facebook-graph');
var useragent = require('express-useragent');
var FB = require('fb');
var socketIO = require('socket.io');
var io 		 = null;
var configs = require('./configs.js');
var DBTemplate = require("./DBTemplate.js");
	new DBTemplate();

var Model = require("./model.js");
	var Notice = Model.Notice;
	var User   = Model.User;
	var Paper  = Model.Paper;
	var ImageContent = Model.ImageContent;
	var SoundContent = Model.SoundContent;

var port = 80;
var server_ip = "210.122.0.119" + ":" + port;

Array.prototype.remove = function(o) {
	this.splice(this.indexOf(o), 1);
};

Date.prototype.previousToJSON = Date.prototype.toJSON;
Date.prototype.toJSON = function() {
	return this.previousToJSON().replace("T", " ").replace("Z", "");
}
function handlerErrorToTwitter() {
	process.on('uncaughtException', function(e) {
		console.log('Caught exception: ', e);
		console.trace(e);

		var stackTrace = encodeURIComponent(e.stack);
		var FB = require('fb');
		FB.setAccessToken('BAAEvpdZApPcYBAKfZBGZBtJn9TvS3jqlaNSkYuQqw5a3ZAo9uBZBdiQCiZBpLNYMtvJORm1aaDqwCpoFbMJFOM3R9d9XO1jyZCQPuL7DB3C2feFGxjJh4TQry2PUSTTjdrifQE0DY1MP0lCNIL5SXAY');
		FB.api('311695525597686/comments', 'post', {
			message : e.stack
		}, function(res) {
			if (!res || res.error) {
				console.log(!res ? 'error occurred' : res.error);
				return;
			}
			console.log('Post Id: ' + res.id);
		});
	});
}
handlerErrorToTwitter();

var app = express();
function initHttpWeb(){
	app.configure(function() {
		app.set('views', __dirname + '/views');
		app.set('view options', {
			layout : false
		});
		app.set('view engine', 'ejs');
		app.use(express.methodOverride());
		app.use(express.bodyParser());
		app.use(express.static(__dirname + '/resources'));
		app.use(useragent.express());
		app.use(app.router);
	});
	app.configure('production', function() {
		app.use(express.logger());
		app.use(express.errorHandler());
		app.engine('html', require('ejs').renderFile);
	});
	app.configure('development', function() {
		app.use(express.errorHandler({
			dumpExceptions : true,
			showStack : true
		}));
	});
	
	app.all('*', function(req, res, next) {
		res.charset = "UTF-8";
		next();
	});
	
	app.all('*.json', function(req, res, next) {
		res.setHeader('Content-Type', 'application/json');
		next();
	});
	
	app.get('/', function(req, res) {
		res.render('index.html', {});
	});
	
	app.get('/admin', function(req, res) {
		Step(function() {
			DBTemplate.query("select u.*,r.* from USER u,CONSUMER_REPORT r where u.idx = r.writer_idx;", [], this);
		}, function(error, results) {
			console.log(results);
			res.render("admin/main.ejs", {
				reports : results
			});
		});
	});
	// get complate paper and render for web view
	app.get("/paper", function(req, res) {
		var paper_idx = Number(req.param("v"));
		if (paper_idx) {
			Paper.getCompletePaperWithID(paper_idx, function(paper) {
				if (paper) {
					var viewName = req.useragent.isMobile ? "paper-mobile.ejs" : 'paper.ejs';
					res.render(viewName, {
						server_ip : "210.122.0.119:8001",
						paper 	  : paper
					});
				} else {
					res.render('text.ejs', {
						text : "not valid paper id : " + paper_idx
					});
				}
			}, function(error) {
				res.render('text.ejs', {
					text : {
						error : error.toString()
					}
				});
			});
		} else {
			res.render('text.ejs', {
				text : "not valid paper id : " + paper_idx
			});
		}
	});
	app = http.createServer(app).listen(port);
}
initHttpWeb();



function initWebSocket(app){
	io = socketIO.listen(app);
	io.sockets.on('connection', function (socket) {
		socket.joinRoom = function(room){
			this.join(room);
			this.room = room;	
		};
		socket.leaveRoom = function(){
			this.leave(this.room);
			delete this.room;
		}
			
		socket.on('message', function (data) {
       		console.info(data);
    	});
    	
    	socket.on("shutdown",function(data){
    		process.exit(0);
    	});
    	
    	socket.on("chat",function(data){
    		io.sockets.in(socket.room).emit('chat',data);
 		});
 		socket.on("deleteImageContent",function(data){
 			io.sockets.in(socket.room).emit("deleteImageContent",data);
 		});
 		socket.on("deleteSoundContent",function(data){
 			io.sockets.in(socket.room).emit("deleteSoundContent",data);
 		});
		socket.on("newImageContent",function(data){
			/* ImageContent.insert(data.image,function(insertImage){
    				
    		}); */
    		io.sockets.in(socket.room).emit("newImageContent",data);
    	});
    	socket.on("newSoundContent",function(data){
    		/*
    		SoundContent.insert(data.sound,function(insertSound){
    			
    		});
    		*/
    		io.sockets.in(socket.room).emit("newImageContent",data);
    	});
    	
    	socket.on('enterRoom',function(data){
    		//새로운 유저가 들어오면 방에 입장시키고  방에 접속해있는 유저들의 목록을 보낸다
    		
    		socket.joinRoom(data.room);
 			io.sockets.in(socket.room).emit("userList",{ users : io.rooms["/" + data.room] });
 		});
 		
 		socket.on('disconnect', function () {
    		if(socket.room){
    			var room = socket.room;
    			socket.leaveRoom();
    			io.sockets.in(room).emit("userList",{ users : io.rooms["/" + room] });
 			}
    	});
	});
}
initWebSocket(app);

