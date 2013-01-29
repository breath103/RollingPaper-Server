var http 	   = require('http');
var express    = require('express');
var fs   	   = require('fs');
var path 	   = require("path");
var url  	   = require("url");
var net  	   = require("net");
var async      = require('async');
var vm 		   = require('vm');
var DBTemplate = require("./DBTemplate.js");
var util       = require("util");
var Step 	   = require("step");
var facebook   = require('facebook-graph');
var useragent  = require('express-useragent');

var port = 8001;
var server_ip = "210.122.0.164" + ":" + port;

Array.prototype.remove = function(o){
	this.splice(this.indexOf(o), 1);
};

DBTemplate.getSingleton();
DBTemplate = new DBTemplate();



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


function initExpressEndSocketIO(){
	var app = express();
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
	app.post("/user/paperList.json",function(req,res) { 
		res.setHeader('Content-Type', 'text/json');
		
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
						res.render('text.ejs', {text : results[0]});
					}
				}
			);
		}
		else {
			res.render('text.ejs', {text : {error : "not validate user_idx"}});
		}
	});
	
	
	function generatePhoneAuthCode() { 
		return "" + Math.floor(Math.random() * 100000);
	}
	
	
	app.post("/user/phoneAuth",function(req,res){
		console.log("/user/phoneAuth");
		var phone  = req.body['phone'];
		if(phone){
			var authcode = generatePhoneAuthCode();
			res.render('text.ejs', {authCode : authcode});	
		}
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
							
							Step(
								function(){
									console.log(user_idx);
									DBTemplate.query("select * from USER where idx = ?;"+
													 " select * from ROLLING_PAPER where idx = ?",[user_idx,paper_idx],this);
								},
								function(error,results){
									if(error) console.log(error);
									
									var user  = results[0][0];
									var paper = results[1][0];
									
									var facebookGraph = new facebook.GraphAPI(user.facebook_accesstoken);
									console.log(results," facebook_graph : ",facebookGraph);
									facebookGraph.putObject(friend_fb_id,"feed",{ 
										message: util.format('%s님이 %s님에게 보낼 "%s" 이벤트를 당신과 함께 준비하고 싶어합니다.',
															  user.name,paper.receiver_name,paper.title), 
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
								}
							);
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
	app.post("/paper/create",function(req,res){
		var creator_idx    = req.body['creator_idx'];
		var title  		   = req.body['title'];
		var target_email   = req.body['target_email'];
		var notice 		   = req.body['notice'];
		var receiver_fb_id = req.body['r_fb_id'];
		var receiver_name  = req.body['r_name'];
		var receive_time   = req.body['r_time'];
		var background     = req.body['background'];
		
		if(!notice)
			notice = "";
		
		if(title && 
		   notice && 
		   target_email && 
		   receiver_fb_id && 
		   receiver_name && 
		   receive_time && 
		   background){
			 Step(
			 	function(){
					DBTemplate.query("call createRollingPaper(?,?,?,?,?,?,?,?)",
			    				  	  [creator_idx,title,target_email,notice,receiver_fb_id,receiver_name,receive_time,background],
									  this);
				},
				function(error,results){ 
					if(error){
						console.error(error);
						res.render('text.ejs', {text : { "error" : "create Rolling Paper DB Error : " + JSON.stringify(error) } });
					}
					else{
						console.log("createRollingPaper Results : ",results);
						res.render('text.ejs', {text : results[0][0]});
					}
				}
			);
		}
		else{
			res.render('text.ejs', {text : { "error" : "some value null : "} });
		}
	});

	app.post("/ondeleteapp",function(req,res){
		console.log("DEAUTH!!!!!");
	//	console.log(req);
		console.log(req.params);
		res.render("text.ejs", {
			text : {a:"!!!!"}
		});
						
	});
	//웹에서 페이퍼를 볼때
	
	app.get("/paper",function(req,res){
		var paper_idx = Number(req.param("v"));
		console.log(paper_idx);
		if(paper_idx){
			Step(
				function(){
					DBTemplate.query("call getPaperForWebView(?)",[paper_idx],this);
				},
				function(error,results){
					if(error) console.log(error);
					
					if(results.length > 1 &&
					   results[0] && results[0][0] &&
					   results[0][0].error){
					   res.render('text.ejs', {text : { "error" : results[0][0].error}});
					}	
					else 
					{
						var paper = results[0][0];
						paper["participants"] = results[1];
						paper["contents"] = {
							image : results[2],
							text  : results[3],
							sound : results[4]
						};
						console.log(paper);
						
						var viewName = req.useragent.isMobile ? "paper-mobile.ejs" : 'paper.ejs';
						if(req.param("m"))
							viewName = "paper-mobile.ejs";
						if(req.param("t"))
							viewName = "paper.ejs";
						/* 페이스북 인증을 해야지만 페이지를 볼 수 있도록 인증페이지로 넘겨버리는 부분 */ 
						res.render(viewName, {
							server_ip : server_ip,
							paper     : paper
						});
						
					}
				}
			);
		}
		else{
			res.render('text.ejs', {text : "not valid paper id : " + paper_idx});
		}
	});
	
	app.post("/paper/edit",function(req,res) { 
		var paper_idx = Number(req.body["paper_idx"]);
		
		var paper_field = {
			title : null,
			target_email : null,
			notice : null,
			background : null
		};
		var paper_data = {};
		for(var key in paper_field)
		{
			if(req.body[key])
				paper_data[key] = req.body[key];
		}
		
		
		if(paper_idx){
			Step(
				function(){
					console.log(paper_data);
					
					
					var sql_map_data = [];
					var settingStrings = [];
					for(var key in paper_data)
					{
						sql_map_data.push(paper_data[key]);
						settingStrings.push(util.format(" %s = ? ",key));
					}
					sql_map_data.push(paper_idx);
					var sql = util.format("update ROLLING_PAPER set %s where idx = ?",settingStrings.join(","));
					console.log(sql);
					console.log(sql_map_data);
					DBTemplate.query(sql,sql_map_data,this);	
				},
				function(error,results) {
					if(error){
						console.log(error);
						res.render('text.ejs', {text : {error : "DB Fetch Fail"}});
					}
					else{
						res.render('text.ejs', {text : {success : null}});
					}
				}
			);	
		}
		else{
			res.render('text.ejs', {text : {success : null}});
		}
	});
	//앱에서 페이퍼를 볼때
	app.post("/paper/contents",function(req,res){
		console.log("/paper/contents");
		var paper_idx  = req.body['paper_idx'];
		var after_time = req.body['after_time'];
		if(paper_idx){
			var contentsResults = {};
			Step(function(){
				DBTemplate.query("call getAllContentsOfPaperAfterTime(?,?)",[paper_idx,after_time],this);
			},function(error,results){
				contentsResults["image"] = results[0];
				contentsResults["text"]  = results[1];
				contentsResults["sound"] = results[2];
				res.render('text.ejs', {text : contentsResults});
			});
		}
		else {
			res.render('text.ejs', {text : {error : "not valid paper_idx"}});
		}
	});
	
	app.post("/paper/addContent/sound",function(req,res){
		console.log("IMAGE_UPLOAD");
	
		var paper_idx = Number(req.body["paper_idx"]);
        var user_idx  = Number(req.body["user_idx"]);
       	var x 	   	  = Number(req.body['x']);
		var y 		  = Number(req.body['y']);
		if(user_idx && paper_idx)
		{
			console.log('-> ' +  util.inspect(req.files));
			//사운드 파일을 읽는다
		    var sound = req.files.sound;
		    console.log("asdfasdfasdf");
		    console.log(sound);
		    //사운드 파일의 타입 검사하는 부분이 들어가야 하지만 일단은 패스
		    //if(sound.type.indexOf('sound') > -1)
		    {
		    	var soundType = sound.type.split("/")[1];
			    var tmp_path  = sound.path;
			    var new_file_name = util.format("%s_%s_%s.%s",user_idx ,paper_idx ,(new Date()).getTime() ,soundType );
			    var target_path = util.format("%s/resources/uploads/%s",
			    							  __dirname,new_file_name);
			    
			    console.log(soundType,tmp_path,new_file_name,target_path,"asdfasdf");
			    Step(
			    	function(){ fs.rename(tmp_path, target_path, this); },
					function(err){
						console.log("Asdfasdf");
						if(err) console.log(err);
						DBTemplate.query("call insertSoundContent(?,?,?,?,?)",
										 [paper_idx,user_idx,x,y,util.format("http://localhost/uploads/%s",new_file_name)],
										this);
					},
					function(error,results){ 
						console.log("GGGG");
						if(error)
						{
							console.log(error);
						}
						res.render('text.ejs', {text : results[0][0]});
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
	app.get("/paper/backgroundList",function(req,res){
		fs.readdir("resources/background",function(err,files){
			files.sort();
			res.setHeader('Content-Type', 'text/json');
			res.render('text.ejs', {text : files});
		});
	});
	app.post("/paper/participants",function(req,res) {
		var paper_idx = Number(req.body["paper"]);
		if(paper_idx){
			Step(function() { 
				DBTemplate.query("call getParticipants(?)",[paper_idx],this);
			},
			function(error,results) {
				if(error){
					console.log(error);
					res.render('text.ejs', {text : {error : "DB Fetch Fail"}});
				}
				else{
					res.render('text.ejs', {text : results[0]});
				}
			});
		}
		else{
			res.render('text.ejs', { 
			 	text : util.format("invalid paper : %d",paper_idx)
			});
		}
	});
	app.post("/paper/addContent/image",function(req,res){
		var paper_idx = Number(req.body["paper_idx"]);
        var user_idx  = Number(req.body["user_idx"]);
        var rotation  = Number(req.body['rotation']);
        var width     = Number(req.body["width"]);
        var height    = Number(req.body["height"]);
       	var x 	   	  = Number(req.body['x']);
		var y 		  = Number(req.body['y']);
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
										[paper_idx,user_idx,x,y,width,height,rotation, 
										util.format("http://localhost/uploads/%s",new_file_name)],
										this);
					},
					function(error,results){ 
						res.render('text.ejs', {text : results[0][0]});
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
	
	app.post("/paper/editContent/image",function(req,res){
		var image_idx = Number(req.body["idx"]);
		var rotation  = Number(req.body['rotation']);
        var width     = Number(req.body["width"]);
        var height    = Number(req.body["height"]);
       	var x 	   	  = Number(req.body['x']);
		var y 		  = Number(req.body['y']);
		var image     = req.body['image'];
		
		//console.log("!!->",req.body);
		if(!image_idx){
			res.render('text.ejs', { 
			 	text : util.format("invalid image_idx : %d",image_idx)
			});
			return;
		}
		
		Step(
			function(){
				console.log(image);
				DBTemplate.query("call editImageContent(?,?,?,?,?,?,?)",[image_idx,x,y,width,height,rotation,image],this)
			},
			function(error,results) {
				if(error){
					console.log(error);
					res.render('text.ejs', {text : {error : "DB Fetch Fail"}});
				}
				else{
					res.render('text.ejs', {text : {success : null}});
				}
			}
		);
	});
	app.post("/paper/editContent/sound",function(req,res){
		var sound_idx = Number(req.body["idx"]);
		var rotation  = Number(req.body['rotation']);
        var width     = Number(req.body["width"]);
        var height    = Number(req.body["height"]);
       	var x 	   	  = Number(req.body['x']);
		var y 		  = Number(req.body['y']);
		var sound     = req.body['sound'];
		
		console.log("!!->",req.body);
		if(!sound_idx){
			res.render('text.ejs', { 
			 	text : util.format("invalid sound_idx : %d",sound_idx)
			});
			return;
		}
		
		Step(
			function(){
				console.log(sound);
				DBTemplate.query("call editSoundContent(?,?,?,?,?,?,?)",[sound_idx,x,y,width,height,rotation,sound],this)
			},
			function(error,results) {
				if(error){
					console.log(error);
					res.render('text.ejs', {text : {error : "DB Fetch Fail"}});
				}
				else{
					res.render('text.ejs', {text : {success : null}});
				}
			}
		);
	});
	app.post("/paper/quit",function(req,res){
		var user_idx  = Number(req.body["user"]);
		var paper_idx = Number(req.body["paper"]);
		if(user_idx && paper_idx){
			Step(
				function(){
					DBTemplate.query("call QuitRoom(?,?)",[user_idx,paper_idx],this);
				},
				function(error,results) {
					if(error) 
					{
						console.log(error);
						res.render('text.ejs', {text : {error : "DB Fetch Fail"}});
					}
					else{
						res.render('text.ejs', {text : {success : null}});
					}
				}
			);
		}
		else{
			res.render('text.ejs', {text : {error : util.format("%s or %s is nil",user_idx,paper_idx)}});
		}
	});
	app.post("/paper/deleteContent/image",function(req,res) {
		var user_idx = Number(req.body["user_idx"]);
		var image_idx = Number(req.body["image_idx"]);
		
		if(user_idx && image_idx){
			Step(
				function(){
					DBTemplate.query("call deleteImageContent(?)",[image_idx],this);
				},
				function(error,results) {
					if(error){
						console.log(error);
						res.render('text.ejs', {text : {error : "DB Fetch Fail"}});
					}
					else{
						res.render('text.ejs', {text : {success : null}});
					}
				}
			);
		}
	});
	app.post("/paper/deleteContent/sound",function(req,res) {
		var user_idx = Number(req.body["user_idx"]);
		var sound_idx = Number(req.body["sound_idx"]);
		
		if(user_idx && sound_idx){
			Step(
				function(){
					DBTemplate.query("call deleteSoundContent(?)",[sound_idx],this);
				},
				function(error,results) {
					if(error){
						console.log(error);
						res.render('text.ejs', {text : {error : "DB Fetch Fail"}});
					}
					else{
						res.render('text.ejs', {text : {success : null}});
					}
				}
			);
		}
	});
	
	app.post("/user/isFacebookFriendUsingRollingPaper",function(req,res){
		var user_idx = Number(req.body["user_idx"]);
		if(user_idx){
			Step(
				function() {
					DBTemplate.query("select * from USER where idx = ?",[user_idx],this);
				},
				function(error,results) {
					if(error){
						console.log(error);
						return;
					}
					var user = results[0];
					var facebookGraph = new facebook.GraphAPI(user.facebook_accesstoken);
					console.log(results," facebook_graph : ",facebookGraph);
					facebookGraph.getConnections('me', 'friends', this);
				},
				function(error,data) {
					console.log(data);
					if(error)
						console.log(error);
					
					var searchedCount = 0; 
					var friendCount = data.data.length;
					
					var resultFriends = [];
					console.log(friendCount);
					
					data.data.forEach(function(e){
						console.log("select * from USER where facebook_id = \'"+e.id+"\'");
						DBTemplate.query("select * from USER where facebook_id = \'"+e.id+"\'",[],function(error,results) { 
							if(error)
								console.log(error);
							console.log(searchedCount, " : " ,results);	
								
							if(results && results[0])
							{
								console.log(results);
								resultFriends.push(e.id);
							}
								
							searchedCount++;
							if(searchedCount >= friendCount)
							{
								console.log(resultFriends);
								res.render('text.ejs', {text : {friends : resultFriends}});
							}
						});
					//	console.log(i," : ",e);
						
					});
				}
			)
		}
	});
		
	app = http.createServer(app).listen(port);
}
initExpressEndSocketIO();




