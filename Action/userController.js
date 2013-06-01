var Step = require("step");
var fs   	   = require('fs');
var Model = require("./model.js");
	var Notice = Model.Notice;
	var User   = Model.User;
	var Paper  = Model.Paper;
	var ImageContent = Model.ImageContent;
	var SoundContent = Model.SoundContent;
var port = 8001;
var server_ip = "210.122.0.119" + ":" + port;
var facebook   = require('facebook-graph');
var userController = function(app) {
	// 페이스북 아이디를 가지고 회원가입할때의 플로우
	app.post("/user/joinWithFacebook.json",function(req,res){
		var params = req.body;
		console.log(req.body);
		Step(
			function(){ //이미 등록되어 있는 페이스북 아이디인지 검사
				User.userWithFacebookID(params.facebook_id,this);
			},
			function(user){
				console.log("!!!! + ",user);
				if(user){ //이미 등록된것인 경우 클라이언트에 알려줌
					res.json({ result : "login" , 
							   user   : user });     
				} 
				else{ // 이미 등록되어 있는 이메일인지 검사
					User.userWithEmail(params.email,this);
				}
			},
			function(user){
				if(user){ //이미 등록된 이메일인 경우 클라이언트에 실패라고 알려줌
					res.json({ result : "fail" , 
							   reason : "already registered email"});     
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
							res.json({result : "join" ,user : createdUser}); 
						else
							res.json({result : "fail" ,reason : "user insert fail"}); 
					});
				}
			}
		);
	});
	
	app.post("/user/join.json",function(req,res){
		var params = req.body;
		Step(function(){
			User.userWithEmail(params.email,this);
		},function(user) {
			if(user){
				res.json({ result : "fail" , 
						   reason : "already registered email"});     
			}
			else{
				user = new User({
					name     	: params.name ,
					email    	: params.email,
					picture  	: params.picture,
					birthday 	: params.birthday,
					password 	: params.password,
					phone 	 	: params.phone
				});
				User.insert(user,function(createdUser){
					if(createdUser)
						res.json({result : "join" ,user : createdUser}); 
					else
						res.json({result : "fail" ,reason : "user insert fail"}); 
				});
			}
		});
	});



	app.post("/user/signin.json",function(req,res){
		var params = req.body;
		console.log(params);
		Step(function(){
			User.userWithEmail(params.email,this);
		},function(user) {
			if(user){
				if(user.password == params.password)
					res.json({ result : "signin", 
							   user   :  user});     
				else
					res.json({ result : "fail" , 
							   reason : "wrong password"});     
			}
			else{
				res.json({ result : "fail" , 
						   reason : "wrong email"});     
			}
		});
	});

	/**
	 * 3rd party mapping for load user for idx 
	 */
	app.all('/user/:id([0-9]+)/*', function(req,res,next){
		var user_idx = Number(req.param("id"));
		User.userWithIdx(user_idx,function(user){
			req.user = user;
			if(user){
				console.log("APP ----- ", user);
				next();
			}
			else{
				res.json({error : "not validate user_idx"});
				next(new Error('cannot find user ' + user_idx));
			}
		});
	});
	
	app.get("/user/findWithFacebookID/:facebook_id([0-9]+).json",function(req,res){
		console.log(req);
		User.userWithFacebookID(req.params["facebook_id"],function(user){
			if(user){
				res.json({user : user});
			}
			else{
				res.json({user : null});
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
					res.json(papers);
				},function(error){
					res.json({error : error.toString()});
				});
			});
		}
		else {
			res.json({error : "not validate user_idx"});
		}
	});
	
	/*
	 *  new version of participating List API
	 */
	app.get("/user/:id([0-9]+)/getParticipatingPapers.json",function(req,res){
		req.user.getParticipatingPapers(function(papers){
			res.json(papers);
		},function(error){
			res.json({error : error.toString()});
		});	
	});
	
	
	app.get("/user/:id([0-9]+)/participating_papers.json",function(req,res){
		req.user.getParticipatingPapers(function(papers){
			res.json({papers : papers});
		},function(error){
			res.json({error : error.toString()});
		});	
	});
	
	/*
	 *  GET receivedpapers with user_idx
	 */
	app.get("/user/:id([0-9]+)/received_papers.json",function(req,res){
		req.user.getReceivedPapers(function(papers){
			res.json({papers : papers});
		},function(error){
			res.json({error : error.toString()});
		});
	});
	
	/*
	 * 그냥 참여중인 종이를 가져올때 보내진것과 아직 작성중인것들을 모두 한꺼번에 조회할까, 아니면 나눠서 할까 고민중이라 일단 미구현
	 */
	app.get("/user/:id([0-9]+)/sended_papers.json",function(req,res){
		req.user.getSendedPapers(function(papers){
			res.json({papers : papers});
		},function(error){
			res.json({error : error.toString()});
		});
	});
	
	/*
	 * GET 해당 유저의 페이스북 친구들중에 이 앱을 사용하는 사람을 검색한다.
	 */
	app.get("/user/:id([0-9]+)/getUsersWhoAreMyFacebookFriend.json",function(req,res){
		var facebookGraph = new facebook.GraphAPI(req.user.facebook_accesstoken);
		Step(
			function() { facebookGraph.getConnections('me', 'friends', this); } ,
			function(error,data){
				if(error){
					console.log(error);
					res.json({error : error.toString() });
				}
				else{
					var fb_id_array = [];
					data.data.forEach(function(e){
						fb_id_array.push(e.id);
					});
					User.usersWithFacebookIDs(fb_id_array,function(users){
						console.log(users);
						res.json({friends : users});
					});
				}
			}
		);
	});
};

module.exports = userController;
