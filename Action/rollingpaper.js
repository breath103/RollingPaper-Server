var http 	   = require('http');
var express    = require('express');
var fs   	   = require('fs');
var path 	   = require("path");
var url  	   = require("url");
var net  	   = require("net");
var async      = require('async');
var vm 		   = require('vm');
var DBTemplate = require("./DBTemplate.js");

var noticeController = require("./noticeController.js");
var paperController  = require("./paperController.js");
var userController   = require("./userController.js");

var Model = require("./model.js");
	var Notice = Model.Notice;
	var User   = Model.User;
	var Paper  = Model.Paper;
	var ImageContent = Model.ImageContent;
	var SoundContent = Model.SoundContent;

var util       = require("util");
var Step 	   = require("step");
var facebook   = require('facebook-graph');
var useragent  = require('express-useragent');
var FB 		   = require('fb');

var port = 8001;
var server_ip = "210.122.0.119" + ":" + port;

Array.prototype.remove = function(o){
	this.splice(this.indexOf(o), 1);
};

Date.prototype.previousToJSON = Date.prototype.toJSON;
Date.prototype.toJSON = function(){
	return this.previousToJSON().replace("T"," ")
								.replace("Z","");
}

function handlerErrorToTwitter(){
	process.on('uncaughtException', function (e) {
		console.log('Caught exception: ',e);
		console.trace(e);
		
		var stackTrace = encodeURIComponent(e.stack);
		var FB = require('fb');
		FB.setAccessToken('BAAEvpdZApPcYBAKfZBGZBtJn9TvS3jqlaNSkYuQqw5a3ZAo9uBZBdiQCiZBpLNYMtvJORm1aaDqwCpoFbMJFOM3R9d9XO1jyZCQPuL7DB3C2feFGxjJh4TQry2PUSTTjdrifQE0DY1MP0lCNIL5SXAY');
		FB.api('311695525597686/comments', 'post', { message: e.stack }, function (res) {
			if(!res || res.error) {
				console.log(!res ? 'error occurred' : res.error);
				return;
			}
			console.log('Post Id: ' + res.id);
		});
	});	
}
//handlerErrorToTwitter();



//DBTemplate.getSingleton();
var DBTemplate = new DBTemplate(function(){

});





function randomString(length) {
    var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz'.split('');
    if (! length) {
        length = Math.floor(Math.random() * chars.length);
    }
    var str = '';
    for (var i = 0; i < length; i++) {
        str += chars[Math.floor(Math.random() * chars.length)];
    }
    return str;
}


var app = express();
	function AppRoutes(){
		// GET current version of application
		app.get("/app/version",function(req,res){
			res.json({version : "v0.9"});
		});
	}
		
	app.configure(function() {
		app.set('views', __dirname + '/views');
		app.set('view options', { layout: false });
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
	});
	app.configure('development', function() {
	    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
	});
	
	app.all('*',function(req,res,next){
		res.charset = "UTF-8";
		next();
	});
	
	app.all('*.json', function(req, res, next){
		res.setHeader('Content-Type', 'application/json');
		next();
	});
	
	app.get('/', function(req, res) {  
		res.render('index.html', {});      
	});
	
	app.get('/admin',function(req,res){
		Step(function(){
			DBTemplate.query("select u.*,r.* from USER u,CONSUMER_REPORT r where u.idx = r.writer_idx;",[],this);
		},function(error,results){
			console.log(results);
			res.render("admin/main.ejs",{
				reports : results 
			});
		});
	});
		
	//초대하기
	app.post("/paper/inviteWithFacebookID",function(req,res){
		var user_idx  		 = req.body[ "user_idx"  ];
		var paper_idx 	 	 = req.body[ "paper_idx" ];
		var facebook_friends = JSON.parse(req.body["facebook_friends"]); 

		if(user_idx && paper_idx){
			var processedFriendCount = 0;
			var facebook_only_friend = 0;
			function addProcessedCount() { 
				processedFriendCount++;
				if(processedFriendCount >= facebook_friends.length){
					res.render('text.ejs', { text : {facebook_only_friend : facebook_only_friend}});	
				}
			}

			facebook_friends.forEach(function(friend_fb_id){
				Step(
					function(){
						DBTemplate.query ("call createTicketWithFacebookID(?,?)",[friend_fb_id,paper_idx],this);
					},
					function(error,allResults){
						var results = allResults[0];
						if(error) 
							console.log(error);
						var friend_id = results[0].guest_idx;
						if(friend_id){
							console.log("joined user : ",friend_fb_id," : ",friend_id);
							addProcessedCount();
						}
						else {
							console.log("not joined user");
							facebook_only_friend++;
							//앱을 사용하는 유저가 아닌경우, 
							//초대한 사람의 정보를 조회하여 액세스 토큰을 얻는다
							//또한, 초대하려고 하는 페이퍼의 정확한 정보를 얻는다.

							Step(function(){
									console.log(user_idx);
									DBTemplate.query(" select * from USER where idx = ?; "+
													 " select * from ROLLING_PAPER where idx = ?",[user_idx,paper_idx],this);
								},
								function(error,results){
									if(error) console.log(error);

									var user  = results[0][0];
									var paper = results[1][0];

									var facebookGraph = new facebook.GraphAPI(user.facebook_accesstoken);
									console.log(results," facebook_graph : ",facebookGraph);
									facebookGraph.putObject(friend_fb_id,"feed",{ 
										message: util.format('%s님이 %s님에게 보낼 "%s" 이벤트를 당신과 함께 준비하고 싶어합니다.',user.name,paper.receiver_name,paper.title), 
									    link : util.format("http://%s/paper?v=%d",server_ip,paper_idx), 
									    	   //'http://www.takwing.idv.hk/facebook/demoapp_jssdk/', 
									    name: 'Rolling Paper', 
									    description: 'RollingPaper'
									  } , this);
								},
								function(error,result){
									if(error) console.log(error);
									console.log(result);

									addProcessedCount();	
							});
						}
					}
				);

			});
		}
		else {
			res.render('text.ejs', { text : {error:"some value nil"}});	
		}
	});	
	//만들기

	app.post("/ondeleteapp",function(req,res){
		console.log("DEAUTH!!!!!");
		console.log(req.params);
		res.render("text.ejs", {
			text : {a:"!!!!"}
		});

	});
	AppRoutes();
	userController(app);
	noticeController(app);

var server = http.createServer(app).listen(port);

	var socketIO = require('socket.io');
	var io = null;
	function initWebSocket(app){
		io = socketIO.listen(app);
		io.sockets.on('connection', function (socket) {
			
		});
	}
	initWebSocket(server);

	paperController(app,io);




		







