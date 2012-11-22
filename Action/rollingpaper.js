var http 	 = require('http');
var express  = require('express');
var app      = express();
var socketIO = require('socket.io');
var sync 	 = require('synchronize')
var io 		 = null;
var fs   	 = require('fs');
var path 	 = require("path");
var url  	 = require("url");
var net  	 = require("net");
var async    = require('async');
var vm 		 = require('vm');
var DBTemplate = require("./DBTemplate.js");
var util     = require("util");
var Step 	 = require("step");

var getNetworkIPs = (function () {
    var ignoreRE = /^(127\.0\.0\.1|::1|fe80(:1)?::1(%.*)?)$/i;

    var exec = require('child_process').exec;
    var cached;
    var command;
    var filterRE;

    switch (process.platform) {
    case 'win32':
    //case 'win64': // TODO: test
        command = 'ipconfig';
        filterRE = /\bIP(v[46])?-?[^:\r\n]+:\s*([^\s]+)/g;
        // TODO: find IPv6 RegEx
        break;
    case 'darwin':
        command = 'ifconfig';
        filterRE = /\binet\s+([^\s]+)/g;
        // filterRE = /\binet6\s+([^\s]+)/g; // IPv6
        break;
    default:
        command = 'ifconfig';
        filterRE = /\binet\b[^:]+:\s*([^\s]+)/g;
        // filterRE = /\binet6[^:]+:\s*([^\s]+)/g; // IPv6
        break;
    }

    return function (callback, bypassCache) {
        if (cached && !bypassCache) {
            callback(null, cached);
            return;
        }
        // system call
        exec(command, function (error, stdout, sterr) {
            cached = [];
            var ip;
            var matches = stdout.match(filterRE) || [];
            //if (!error) {
            for (var i = 0; i < matches.length; i++) {
                ip = matches[i].replace(filterRE, '$1')
                if (!ignoreRE.test(ip)) {
                    cached.push(ip);
                }
            }
            //}
            callback(error, cached);
        });
    };
})();


var port = 8001;
var server_ip = null;
getNetworkIPs(function (error, ip) {
    console.log(ip);
    server_ip = ip[0]+":"+port;
    if (error) {
        console.log('error:', error);
    }
}, false);
Array.prototype.remove = function(o){
	this.splice(this.indexOf(o), 1);
};

DBTemplate = new DBTemplate();




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
	app.post("/user/joinWithFacebook",function(req,res){
		var params = req.body;
		Step(
			function(){ //이미 등록되어 있는 페이스북 아이디인지 검사
				DBTemplate.select("select * from USER where facebook_id=?",
								  [params.facebook_id],
								  this);	
			},
			function(results){ 
				console.log("fb ",results);
				if(results && results.length > 0){ //이미 등록된것인 경우 클라이언트에 알려줌
					res.render('text.ejs', {text : { result : "login" , 
													 user   : results[0] }});     
				}else{ // 이미 등록되어 있는 이메일인지 검사
					DBTemplate.select("select * from USER where email=?",
								  	  [params.email],
								  	  this);	
				}
			},
			function(results){
				console.log("email ",results);
				if(results && results.length > 0){ //이미 등록된 이메일인 경우 클라이언트에 실패라고 알려줌
					res.render('text.ejs', {text : { result : "fail" , 
													 reason : "already registered email"}});     
				}	
				else{ //모든 조건을 검사한경우 USER 테이블에 넣는다
					DBTemplate.insert("USER",{
						name     	: params.name ,
						email    	: params.email,
						picture  	: params.picture,
						birthday 	: params.birthday,
						password 	: params.password,
						facebook_id : params.facebook_id,
						facebook_accesstoken : params.facebook_accesstoken,
						phone 	 	: params.phone
					},this);
				}
			},
			function(results){ // 유저를 테이블에 넣는게 끝나면, 인서트 된 유저를 다시 셀렉트해서 가져온다
				DBTemplate.select("SELECT * FROM USER WHERE idx = ?",results.insertId,this);
			},
			function(results){ // 셀렉트해서 가져온 유저를 클라이언트에게 알려준다
				res.render('text.ejs', {text : {result : "join" ,user : results[0]} }); 
			}
		);
	});
	
	//현재 참여중인 페이퍼들의 리스트
	app.post("/user/paperList",function(req,res) { 
		var user_idx = req.body["user_idx"];
		if(user_idx){
			Step(
				function() { 
					DBTemplate.query("call getAllParticipatingPapers(?)",[user_idx],this);
				},
				function(error,results) {
					if(error){
						console.log(error);
					} 
					else {
						console.log(results);
						res.render('text.ejs', {text : results});
					}
				}
			);
		}
	});
	//초대하기
	
	app.post("/paper/inviteWithFacebookID",function(req,res){
		var user_idx  		 = req.body[ "user_idx"  ];
		var paper_idx 	 	 = req.body[ "paper_idx" ];
		var facebook_friends = JSON.parse(req.body["facebook_friends"]); 
		if(user_idx && paper_idx){
			var friend_fb_id = facebook_friends[0];
			Step(
				function(){
					DBTemplate.query ("call createTicketWithFacebookID(?,?)",
							   [friend_fb_id,paper_idx],
							   this);
				},
				function(error,results){
					if(error) console.log(error);
					var friend_id = results[0];
					console.log(friend_fb_id," : ",friend_id);
					if(friend_id){
						console.log("joined user");
					}
					else {
						console.log("not joined user");
					}
					res.render('text.ejs', {text : {
						facebook_id : friend_fb_id,
						friend_id	: friend_id
					}});		
				}
			);
		}
		else {
			
		}

	/*
		var user_idx  		 = req.body[ "user_idx"  ];
		var paper_idx 	 	 = req.body[ "paper_idx" ];
		var facebook_friends = JSON.parse(req.body["facebook_friends"]); //문자열로 패칭되서 넘어오는 페이스북 친구들을 모두 받아온다.
		if(user_idx && paper_idx){
			var invitedFriend = [];
			var notInvitedFriend = [];
			var stepFunctionArray = [];
			//연쇄적으로 데이터를 쭉 가져오는 부분인데, 우선 첫번째 호출
			var firstFacebookId = facebook_friends.shift(1);
			stepFunctionArray.push(function(){
				DBTemplate.query ("call createTicketWithFacebookID(?,?)",
								   [firstFacebookId,paper_idx],
								   this);
			});
			// 중간 호출들
			facebook_friends.forEach(function(facebook_id,i){
				stepFunctionArray.push(function(error,results){
					if(error) console.log(error);
					
					var friend_id = results[0];
					console.log(facebook_id," : ",friend_id);
					if(friend_id)
					{
						invitedFriend.push(friend_id);
					}
					else 
					{
						notInvitedFriend.push(friend_id);
					}	
					DBTemplate.query ("call createTicketWithFacebookID(?,?)",
									  [facebook_id,paper_idx],
									  this);
				});
			});
			
			
			stepFunctionArray.push(function(error,results){
				if(error) console.log(error);
				var friend_id = results[0];
				console.log(facebook_id," : ",friend_id);
				if(friend_id){
					invitedFriend.push(friend_id);
				}
				else {
					notInvitedFriend.push(friend_id);
				}	
				res.render('text.ejs', {text : {
					invited 	: invitedFriend,
					not_invited : notInvitedFriend
				}});
			});
			
			Step.apply(Step,stepFunctionArray);
		}
		else {
			
		}
		*/
	});
	
	//만들기
	app.post("/paper/create",function(req,res){
		var creator_idx    = req.body['creator_idx'];
		var title  		   = req.body['title'];
		var target_email   = req.body['target_email'];
		var notice 		   = req.body['notice'];
		var receiver_fb_id = req.body['r_fb_id'];
		var receiver_name  = req.body['r_name'];
		var receive_time   = req.body['r_time'];
		
		if(!notice)
			notice = "";
		
		if(title && 
		  notice && 
		  target_email && 
		  receiver_fb_id && 
		  receiver_name && 
		  receive_time){
			 Step(
			 	function(){
					DBTemplate.query("call createRollingPaper(?,?,?,?,?,?,?)",
			    				  	  [creator_idx,title,target_email,notice,receiver_fb_id,receiver_name,receive_time],
									  this);
				},
				function(error,results){ 
					if(error){
						console.error(error);
					}
					else{
						console.log("createRollingPaper Results : ",results);
						res.render('text.ejs', {text : results});
					}
				}
			);
		}
		else{
			
		}
	});
	//웹에서 페이퍼를 볼때
	app.get("/paper",function(req,res){
		var paper_idx = req.param("v");
		console.log(req.params);
		if(paper_idx)
		{
			(function(){
			var contentsResults = {};
			Step(
				function(){
					DBTemplate.query("select * from ROLLING_PAPER where idx = ?",[paper_idx],this);
				},
				function(error,results){
					if(error) console.log(error);
					if( results.length != 1 ){
						res.render('text.ejs', {text : "not valid paper_idx"});
					}
					else
					{
						contentsResults = results[0];
						DBTemplate.query("select u.* from ROLLING_PAPER_TICKET t,USER u where t.paper_idx = ? and t.user_idx = u.idx group by u.idx",[paper_idx],this);
					}					
				},
				function(error,results){				
					if(error) console.log(error);
					contentsResults["participants"] = results;
					DBTemplate.query("select * from IMAGE_CONTENT where paper_idx = ?",[paper_idx],this);
				},
				function(error,imageResults){
					if(error) console.log(error);
					console.log("image results ",imageResults);
					contentsResults["image"] = imageResults;
					DBTemplate.query("select * from TEXT_CONTENT  where paper_idx = ?",[paper_idx],this);
				},
				function(error,results){
					if(error) console.log(error);
					contentsResults["text"] = results;
					
					console.log("text results ",results);
					DBTemplate.query("select * from SOUND_CONTENT  where paper_idx = ?",[paper_idx],this);
				},
				function(error,results){
					if(error) console.log(error);
					contentsResults["sound"] = results;
					console.log("sound results ",results);
					
					console.log(contentsResults);
					res.render('paper.ejs', {
						server_ip : server_ip,
						paper : contentsResults
					});
				}
			);
			})();
		}
		else{
			res.render('text.ejs', {text : "not valid paper id" + paper_idx});
		}
	});
	//앱에서 페이퍼를 볼때
	app.post("/paper/contents",function(req,res){
		console.log("/paper/contents");
		var paper_idx = req.body['paper_idx'];
		var after_time  = req.body['after_time'];
		if(paper_idx){
			var contentsResults = {};
			Step(
				function(){
					DBTemplate.query("select * from IMAGE_CONTENT where paper_idx = ? and modify_time > ?",[paper_idx,after_time],this);
				},
				function(error,results){
					if(error) console.log(error);
					contentsResults["image"] = results;
					DBTemplate.query("select * from TEXT_CONTENT  where paper_idx = ? and modify_time > ?",[paper_idx,after_time],this);
				},
				function(error,results){
					if(error) console.log(error);
					contentsResults["text"] = results;
					DBTemplate.query("select * from SOUND_CONTENT  where paper_idx = ? and modify_time > ?",[paper_idx,after_time],this);
				},
				function(error,results){
					if(error) console.log(error);
					contentsResults["sound"] = results;
					
					res.render('text.ejs', {text : contentsResults});
					console.log(paper_idx," ",after_time," ",contentsResults);
				}
			);
		}
		else {
			res.render('text.ejs', {text : {error : "not validate paper_idx"}});
		}
	});
	app.post("/paper/addContent/sound",function(req,res){
		console.log("IMAGE_UPLOAD");
		var paper_idx = req.body["paper_idx"];
        var user_idx  = req.body["user_idx"];
       	var x 	   	  = req.body['x'];
		var y 		  = req.body['y'];
		console.log(req.body);
		if(user_idx && paper_idx)
		{
			console.log('-> ' +  util.inspect(req.files));
			//사운드 파일을 읽는다
		    var sound = req.files.sound;
		   
		    //사운드 파일의 타입 검사하는 부분이 들어가야 하지만 일단은 패스
		    //if(sound.type.indexOf('sound') > -1)
		    {
		    	var soundType = sound.type.split("/")[1];
			    var tmp_path  = sound.path;
			    var new_file_name = util.format("%s_%s_%s.%s",user_idx ,paper_idx ,(new Date()).getTime() ,soundType );
			    var target_path = util.format("%s/resources/uploads/%s",
			    							  __dirname,new_file_name);
			    Step(
			    	function(){
				    	fs.rename(tmp_path, target_path, this);
					},
					function(err){
						if(err) throw err;
						DBTemplate.query("call insertSoundContent(?,?,?,?,?)",
										 [paper_idx,user_idx,x,y,util.format("http://localhost/uploads/%s",new_file_name)],
										this);
					},
					function(error,results){ 
						res.render('text.ejs', {text : results[0]});
						console.log("upload : ",results);
					}
				);
			}
		}
		else {
			res.render('text.ejs', { 
			 	text : util.format("invalid user : %s or paper : %s",user_idx,paper_idx)
			});
		}
	});
	app.post("/paper/addContent/image",function(req,res){
		console.log("IMAGE_UPLOAD");
		var paper_idx = req.body["paper_idx"];
        var user_idx  = req.body["user_idx"];
        var rotation  = req.body['rotation'];
        var width     = req.body["width"];
        var height    = req.body["height"];
       	var x 	   	  = req.body['x'];
		var y 		  = req.body['y'];
		console.log(req.body);
		if(user_idx && paper_idx)
		{
			console.log('-> ' +  util.inspect(req.files));
		    var image = req.files.image;
		   
		    if(image.type.indexOf('image') > -1)
		    {
		    	var imageType = image.type.split("/")[1];
			    var tmp_path  = image.path;
			    var new_file_name = util.format("%s_%s_%s.%s",user_idx ,paper_idx ,(new Date()).getTime() ,imageType );
			    var target_path = util.format("%s/resources/uploads/%s",
			    							  __dirname,new_file_name);
			    Step(
			    	function(){
				    	fs.rename(tmp_path, target_path, this);
					},
					function(err){
						if(err) throw err;
						DBTemplate.query("call insertImageContent(?,?,?,?,?,?,?,?)",
										[paper_idx,user_idx,x,y,width,height,rotation, util.format("http://localhost/uploads/%s",new_file_name)],
										this);
					},
					function(error,results){ 
						res.render('text.ejs', {text : results[0]});
						console.log("uploade",results);
					}
				);
			}
		}
		else {
			res.render('text.ejs', { 
			 	text : util.format("invalid user : %s or paper : %s",user_idx,paper_idx)
			});
		}
	});

	app = http.createServer(app).listen(port);
	io = socketIO.listen(app);
}
initExpressEndSocketIO();




