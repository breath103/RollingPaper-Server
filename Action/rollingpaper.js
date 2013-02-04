var http 	   = require('http');
var express    = require('express');
var fs   	   = require('fs');
var path 	   = require("path");
var url  	   = require("url");
var net  	   = require("net");
var async      = require('async');
var vm 		   = require('vm');
var DBTemplate = require("./DBTemplate.js");

var Model = require("./model.js");
	var Notice = Model.Notice;
	var User   = Model.User;
	var Paper  = Model.Paper;
	var ImageContent = Model.ImageContent;

var util       = require("util");
var Step 	   = require("step");
var facebook   = require('facebook-graph');
var useragent  = require('express-useragent');

var port = 8001;
var server_ip = "210.122.0.164" + ":" + port;

Array.prototype.remove = function(o){
	this.splice(this.indexOf(o), 1);
};

Date.prototype.previousToJSON = Date.prototype.toJSON;
Date.prototype.toJSON = function(){
	return this.previousToJSON().replace("T"," ")
								.replace("Z","");
}


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
			res.render('text.ejs', {text : "v0.9"});
		});
	}
	function NoticeRoutes(){
		/**
		 * GET all Notice 
		 */
		app.get("/notice.json",function(req,res){
			Notice.getAll(function(noticeList){
				res.json(noticeList);
				//res.render('text.ejs', {text : noticeList});
			},function(error){
				res.render('text.ejs', {text : {error : error.toString()}});
			});
		});
		
		/**
		 * GET Notice With IDX 
		 */
		app.get("/notice/:id.json", function(req,res){
			Notice.getWithID(req.params['id'],function(notice){
				res.render('text.ejs', {text : notice});	
			},function(error){
				res.render('text.ejs', {text : {error : error.toString()}});
			});
		});
		
		/**
		 * POST write the Notice 
		 */
		app.post("/notice.json",function(req,res){
			var notice = new Notice({
				title : req.param("title"),
				text  : req.param("text")
			});
			
			Notice.insert(notice,function(results){
				res.render('text.ejs', {text : {success : results}});
			},function(error){
				res.render('text.ejs', {text : {error : error.toString()}});
			});
		});
		
		/**
		 * DELETE delete the Notice 
		 */
		app.del("/notice/:id.json",function(req,res){
			Notice.deleteWithID(req.param("id"),
			function(results){
				res.render('text.ejs', {text : {success : results}});
			},function(error){
				res.render('text.ejs', {text : {error : error.toString()}});
			});
		});
		
		/**
		 * UPDATE update the notice 
		 */
		app.put("/notice/:id.json",function(req,res){
			var notice_idx = Number(req.params["id"]);
			Notice.getWithID(notice_idx,function(notice){
				if(notice){
					notice.setWithDict(req.params);
					Notice.update(notice,function(notice){
						if(notice)
							res.render('text.ejs', {text : {success : notice}});
						else 
							res.render('text.ejs', {text : {error : "there is no Notice with id " + notice_idx}});	
					});
				}
				else{
					res.render('text.ejs', {text : {error : "invalid Notice id " + notice_idx}});
				}
			});
		});
		
	}
	function PaperRoutes(){
		/**
		 * 
		 *  var creator_idx    = req.body['creator_idx'];
			var title  		   = req.body['title'];
			var target_email   = req.body['target_email'];
			var notice 		   = req.body['notice'];
			var width		   = req.body['width'];
			var height  	   = req.body['height'];
			var receiver_fb_id = req.body['receiver_fb_id'];
			var receiver_name  = req.body['receiver_name'];
			var receive_time   = req.body['receive_time'];
			var receive_tel    = req.body['receive_tel'];
			var background     = req.body['background']; 
		 */
		// new version of creating paper 
		app.post("/paper.json",function(req,res){
			var paper = new Paper(req.body);
			Paper.insert(paper,
				function(paper){
					res.render('text.ejs', {text : { success : paper }});
				},function(error){
					res.render('text.ejs', {text : { error : JSON.stringify(error) } });
				});
		});
		
		// current using API 
		// old version of creating paper
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
	
		// get complete paper with json
		/*
		 * this API replace the "/paper/contents" /
		 */
		app.get("/paper/:id.json",function(req,res){
			var paper_idx = Number(req.param("id"));
			if(paper_idx){
				Paper.getCompletePaperWithID(paper_idx,function(paper){
					res.render('text.ejs', {text : paper});
				},function(error){
					res.render('text.ejs', {error : error.toString()});
				});
			}
			else{
				res.render('text.ejs', {text : "not valid paper id : " + paper_idx});
			}
		});
		
		// get complate paper and render for web view
		app.get("/paper",function(req,res){
			var paper_idx = Number(req.param("v"));
			if(paper_idx){
				Paper.getCompletePaperWithID(paper_idx,function(paper){
					if(paper){
						var viewName = req.useragent.isMobile ? "paper-mobile.ejs" : 'paper.ejs';
						if(req.param("m")) viewName = "paper-mobile.ejs";
						if(req.param("t")) viewName = "paper.ejs";
						/* 페이스북 인증을 해야지만 페이지를 볼 수 있도록 인증페이지로 넘겨버리는 부분 */ 
						res.render(viewName, {
							server_ip : server_ip,
							paper     : paper
						});	
					}
					else{
						res.render('text.ejs', {text : "not valid paper id : " + paper_idx});
					}					
				},function(error){
					res.render('text.ejs', {text :{error : error.toString()}});
				});
			}
			else{
				/***
				 *
				 *  사용자가 잘못된 페이퍼를 보고 싶어할때 다른게 보이도록 수정 필요
				 *  이를테면 제대로 된 웹페이지에서 잘못된 페이지임을 알리는 부분을
				 *  
				 */
				res.render('text.ejs', {text : "not valid paper id : " + paper_idx});
			}
		});
		
		/**
		 * old ( current )  
		 */
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
		
		/*
		 * new
		 */
		app.get("/paper/:id/participants.json",function(req,res) {
			var paper_idx = Number(req.params["id"]);
			if(paper_idx){
				Paper.paperWithIdx(paper_idx,function(paper){
					if(paper){
						paper.getParticipants(function(participants){
							res.render('text.ejs', { text : participants});						
						},function(error){
							res.render('text.ejs', { text : {error : error.toString()}});
						});
					}
					else{
						res.render('text.ejs', { text :  { error : "there is no paper with idx" + paper_idx}});
					}	
				});
			}
			else{
				res.render('text.ejs', { text : {error : "invalid paper idx : "+paper_idx}});
			}
		});
		
		
		
		/**
		 * old version of update paper 
		 */
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
		
		
		/*
		 *  new version of update paper
		 *  needs TEST 
		 */
		app.put('paper/:id', function(req, res) {
			Paper.paperWithIdx(req.params["id"],function(paper){
				console.log(paper);
				paper.setWithDict(req.params);
				console.log(paper);
				// paper.update 함수 업데이트 필요
				paper.update(paper,function(results){
					res.render('text.ejs', {text : {success : null}});
				},function(error){
					res.render('text.ejs', {text : {error : error.toString() }});
				});
			});
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
			var paper_idx = Number(req.body["paper_idx"]);
	        var user_idx  = Number(req.body["user_idx"]);
	       	var x 	   	  = Number(req.body['x']);
			var y 		  = Number(req.body['y']);
			if(user_idx && paper_idx)
			{
			    var sound = req.files.sound;
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
							if(err) 
								console.log(err);
							else{
								DBTemplate.query("call insertSoundContent(?,?,?,?,?)",
											 [paper_idx,user_idx,x,y,util.format("http://localhost/uploads/%s",new_file_name)],
											this);
							}
						},
						function(error,results){ 
							if(error)
								console.log(error);
							else{
								res.render('text.ejs', {text : results[0][0]});
							}
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
		
		
		
		
		/*
		 *  old version of get backgroundList
		 */
		app.get("/paper/backgroundList",function(req,res){
			fs.readdir("resources/background",function(err,files){
				files.sort();
				res.render('text.ejs', {text : {backgrounds : files}});
			});
		});
		
		/*
		 * new version of get backgroundList
		 */
		app.get("/paper_backgroundList.json",function(req,res){
			fs.readdir("resources/background",function(error,files){
				if(error)
					res.render('text.ejs', {text : {error : error.toString()}});
				else{
					files.sort();
					res.render('text.ejs', {text : {backgrounds : files}});
				}	
			});
		});
		
		
		
		app.post("/paper/addContent/image",function(req,res){
			var params = req.body;
			params.imageFile = req.files.image;
			ImageContent.insert(params,function(imageContent){
				if(imageContent)
					res.render('text.ejs', {text : imageContent});
				else
					res.render('text.ejs', { text : {error:util.format("invalid user : %s or paper : %s",user_idx,paper_idx) }});
			});
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
		
		
		/**
		 * old version of quiting paper 
		 */
		app.post("/paper/quit",function(req,res){
			var user_idx  = Number(req.body["user"]);
			var paper_idx = Number(req.body["paper"]);
			if(user_idx && paper_idx){
				User.userWithIdx(user_idx,function(user){
					if(user){
						user.quitPaper(paper_idx,function(){
							res.render('text.ejs', {text : {success : null}});
						},function(error){
							res.render('text.ejs', {text : {error : error.toString() }});
						});
					}
					else{
						res.render('text.ejs', {text : {error : "not exist user"}});
					}
				});
			}
			else{
				res.render('text.ejs', {text : {error : util.format("%s or %s is nil",user_idx,paper_idx)}});
			}
		});
		
		
		app.all('/paper/imageContent/:id([0-9]+)', function(req,res,next){
			var content_idx = Number(req.param("id"));
			ImageContent.imageContentWithIdx(content_idx,function(imageContent){
				req.imageContent = imageContent;
				if(ImageContent){
					console.log("APP ++ ",imageContent);
					next();
				}
				else{
					res.render('text.ejs', {text : {error : "not validate imageContent idx "+content_idx}});
					next(new Error('cannot find ImageContent ' + content_idx));
				}
			});
		});
		
		
		app.del("/paper/ImageContent/:id([0-9]+)",function(req,res){
			var user_idx  = Number(req.body["user_idx"]);
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
		
		/**
		* 컨텐츠 삭제 옛날버젼
		*/
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
	}
	function UserRoutes(){
		// 페이스북 아이디를 가지고 회원가입할때의 플로우
		app.post("/user/joinWithFacebook.json",function(req,res){
			var params = req.body;
			
			Step(
				function(){ //이미 등록되어 있는 페이스북 아이디인지 검사
					User.userWithFacebookID(params.facebook_id,this);
				},
				function(user){
					console.log("!!!! + ",user);
					if(user){ //이미 등록된것인 경우 클라이언트에 알려줌
						res.render('text.ejs', {text : { result : "login" , 
														 user   : user }});     
					} 
					else{ // 이미 등록되어 있는 이메일인지 검사
						User.userWithEmail(params.email,this);
					}
				},
				function(user){
					if(user){ //이미 등록된 이메일인 경우 클라이언트에 실패라고 알려줌
						res.render('text.ejs', {text : { result : "fail" , 
														 reason : "already registered email"}});     
					}	
					else{ //모든 조건을 검사한경우 USER 테이블에 넣는다
						user = new User({
							name     	: params.name ,
							email    	: params.email,
							picture  	: params.picture,
							birthday 	: params.birthday,
							password 	: params.password,
							facebook_id : params.facebook_id,
							facebook_accesstoken : params.facebook_accesstoken,
							phone 	 	: params.phone
						});
						User.insert(user,function(createdUser){
							if(createdUser)
								res.render('text.ejs', {text : {result : "join" ,user : createdUser} }); 
							else
								res.render('text.ejs', {text : {result : "fail" ,reason : "user insert fail"} }); 
						});
					}
				}
			);
		});
	
	
		/**
		 * 3rd party mapping for load user for idx 
		 */
		app.all('/user/:id([0-9]+)/*', function(req,res,next){
			var user_idx = Number(req.param("id"));
			User.userWithIdx(user_idx,function(user){
				req.user = user;
				if(user){
					console.log("APP ++ ", user);
					next();
				}
				else{
					res.render('text.ejs', {text : {error : "not validate user_idx"}});
					next(new Error('cannot find user ' + user_idx));
				}
			});
		});
		
		
		/***
		 *
		 *  route for delete user NEED TO IMPLEMENT  
		 */
		app.del("/user/:id([0-9]+)",function(req,res){
			
		});
		
		
		/*
		 *  old version of participating List API
		 */
		app.post("/user/paperList",function(req,res) { 
			var user_idx = req.body["user_idx"];
			if(user_idx){
				User.userWithIdx(user_idx,function(user){
					user.getParticipatingPapers(function(papers){
						res.render('text.ejs', {text : papers});
					},function(error){
						res.render('text.ejs', {text : {error : error.toString()}});
					});
				});
			}
			else {
				res.render('text.ejs', {text : {error : "not validate user_idx"}});
			}
		});
		
		/*
		 *  new version of participating List API
		 */
		app.get("/user/:id([0-9]+)/getParticipatingPapers.json",function(req,res){
			req.user.getParticipatingPapers(function(papers){
				res.render('text.ejs', {text : papers});
			},function(error){
				res.render('text.ejs', {text : {error : error.toString()}});
			});	
		});
		
		/*
		 *  GET receivedpapers with user_idx
		 */
		app.get("/user/:id([0-9]+)/getReceivedPapers.json",function(req,res){
			req.user.getReceivedPapers(function(papers){
				res.render('text.ejs', {text : papers});
			},function(error){
				res.render('text.ejs', {text : {error : error.toString()}});
			});
		});
		
		/*
		 *
		 * 그냥 참여중인 종이를 가져올때 보내진것과 아직 작성중인것들을 모두 한꺼번에 조회할까, 아니면 나눠서 할까 고민중이라 일단 미구현
		 * 
		 *  
		 */
		app.get("/user/:id([0-9]+)/getSendedPapers.json",function(req,res){
			
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
	
	NoticeRoutes();
	PaperRoutes();
	UserRoutes();
	AppRoutes();
	

	
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
							
							Step(function(){
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
	//	console.log(req);
		console.log(req.params);
		res.render("text.ejs", {
			text : {a:"!!!!"}
		});
						
	});
	//웹에서 페이퍼를 볼때
	
	
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

	
//	console.log(app.routes);
	app = http.createServer(app).listen(port);

setTimeout(function(){
	var http = require('http');
	var options = {
		hostname: '210.122.0.164',
  		path: '/notice.json',
  		port: '8001',
  		headers : {
  			'user-agent' : "NODE.JS"
  		}
	};

	var req = http.request(options, function(response) {
		var str = ''
		response.on('data', function (chunk) {
			str += chunk;
		});
		response.on('end', function () {
			console.log("/notice.json");
			console.log(JSON.parse(str));
		});
	});
	req.end();
	
	console.log("ASDG");
	User.userWithFacebookID('100002717246207',function(user){
		console.log(user);
	});
	
	
	
},1500);



