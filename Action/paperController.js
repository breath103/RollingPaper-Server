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

var paperController = function(app,io) {

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
	app.post("/paper.json", function(req, res) {
		var paper = new Paper(req.body);
		Paper.insert(paper, function(paper) {
			res.json({success:paper});
		}, function(error) {
			res.json({error:error.toString()});
		});
	});

	// get complete paper with json
	/*
	 * this API replace the "/paper/contents" /
	 */
	app.get("/paper/:id([0-9]+).json", function(req, res) {
		var paper_idx = Number(req.param("id"));
		if (paper_idx) {
			Paper.getCompletePaperWithID(paper_idx, function(paper) {
				res.json(paper);
			}, function(error) {
				res.json({error:error.toString()});
			});
		} else {
			res.render('text.ejs', {
				text : "not valid paper id : " + paper_idx
			});
		}
	});


	
	app.get("/allPaper",function(req,res) {
		
		Paper.findAll(function(papers){
			res.json(papers);
		},function(error){
		
		});
	});

	// get complate paper and render for web view
	app.get("/paper", function(req, res) {
		var paper_idx = Number(req.param("v"));
		if (paper_idx) {
			Paper.getCompletePaperWithID(paper_idx, function(paper) {
				if (paper) {
					var viewName = req.useragent.isMobile ? "paper-mobile.ejs" : 'paper.ejs';
					if (req.param("m"))
						viewName = "paper-mobile.ejs";
					if (req.param("t"))
						viewName = "paper.ejs";
					/* 페이스북 인증을 해야지만 페이지를 볼 수 있도록 인증페이지로 넘겨버리는 부분 */
					res.render(viewName, {
						server_ip : server_ip,
						paper : paper
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

	/*
	 * new
	 */
	app.get("/paper/:id/participants.json", function(req, res) {
		var paper_idx = Number(req.params["id"]);
		if (paper_idx) {
			Paper.paperWithIdx(paper_idx, function(paper) {
				if (paper) {
					paper.getParticipants(function(participants) {
						res.json(participants);
					}, function(error) {
						res.render('text.ejs', {
							text : {
								error : error.toString()
							}
						});
					});
				} else {
					res.render('text.ejs', {
						text : {
							error : "there is no paper with idx" + paper_idx
						}
					});
				}
			});
		} else {
			res.render('text.ejs', {
				text : {
					error : "invalid paper idx : " + paper_idx
				}
			});
		}
	});

	var paperWithIdx = function(req, res, next) {
		Paper.paperWithIdx(req.params["id"], function(paper) {
			if (paper) {
				req.paper = paper;
				delete req.params.id;
				next();
			} else {
				res.json({
					error : "there is no paper that has idx " + req.params["id"]
				});
			}
		});
	}
	/**
	 * old version of update paper
	 */
	app.post("/paper/edit", function(req, res) {
		var paper_idx = Number(req.body["paper_idx"]);

		var paper_field = {
			title : null,
			target_email : null,
			notice : null,
			background : null
		};
		var paper_data = {};
		for (var key in paper_field) {
			if (req.body[key])
				paper_data[key] = req.body[key];
		}
		if (paper_idx) {
			Step(function() {
				console.log(paper_data);

				var sql_map_data = [];
				var settingStrings = [];
				for (var key in paper_data) {
					sql_map_data.push(paper_data[key]);
					settingStrings.push(util.format(" %s = ? ", key));
				}
				sql_map_data.push(paper_idx);
				var sql = util.format("update ROLLING_PAPER set %s where idx = ?", settingStrings.join(","));
				console.log(sql);
				console.log(sql_map_data);
				DBTemplate.query(sql, sql_map_data, this);
			}, function(error, results) {
				if (error) {
					console.log(error);
					res.render('text.ejs', {
						text : {
							error : "DB Fetch Fail"
						}
					});
				} else {
					res.render('text.ejs', {
						text : {
							success : null
						}
					});
				}
			});
		} else {
			res.render('text.ejs', {
				text : {
					success : null
				}
			});
		}
	});

	/*
	 *  new version of update paper
	 *  needs TEST
	 */
	app.put("/paper/:id([0-9]+).json", paperWithIdx, function(req, res) {
		var currentPaper = req.paper;
		console.log(currentPaper);
		currentPaper.setFields(req.body);
		console.log(req.body);
		console.log(currentPaper);
		Paper.update(currentPaper, function(paper) {
			res.json({success : paper});
		}, function(error) {
			res.json({failure : error.toString()});
			throw error;
		});
	});

	app.post("/paper/addContent/sound", function(req, res) {
		var params = req.body;
		params.soundFile = req.files.sound;
		SoundContent.insert(params, function(soundContent) {
			if (soundContent)
				res.json(soundContent);
			else
				res.json({error : util.format("invalid user : %s or paper : %s", user_idx, paper_idx)});
		});
	});
	
	/*
	 * new version of get backgroundList
	 */
	app.get("/paper_backgroundList.json", function(req, res) {
		fs.readdir("resources/background", function(error, files) {
			if (error)
				res.json({error : error.toString()});
			else {
				files.sort();
				res.json({backgrounds : files});
			}
		});
	});

	app.post("/paper/addContent/image", function(req, res) {
		var params = req.body;
		params.imageFile = req.files.image;
		ImageContent.insert(params, function(imageContent) {
			if (imageContent)
			{
				res.json({success : imageContent});
				io.sockets.emit("newImageContent",{image : imageContent});
			}
			else
				res.json({error : util.format("invalid user : %s or paper : %s", user_idx, paper_idx)});
		});
	});

	app.post("/paper/editContent/image", function(req, res) {
		ImageContent.imageContentWithIdx(req.body["idx"],function(imageContent){
			var imageContent = new ImageContent(req.body);
			console.log(imageContent);
			ImageContent.update(imageContent,function(updatedImage){
				res.json({ success:updatedImage });
			},function(error){
				res.json({error : error.toString()});
			});
		});
	});
	app.post("/paper/editContent/sound", function(req, res) {
		SoundContent.soundContentWithIdx(req.body["idx"],function(soundContent){
			var soundContent = new SoundContent(req.body);
			console.log(soundContent);
			SoundContent.update(soundContent,function(updatedSound){
				res.json({ success:updatedSound });
			},function(error){
				res.json({error : error.toString()});
			});
		});

	});

	/**
	 * old version of quiting paper
	 */
	app.post("/paper/quit", function(req, res) {
		var user_idx = Number(req.body["user"]);
		var paper_idx = Number(req.body["paper"]);
		if (user_idx && paper_idx) {
			User.userWithIdx(user_idx, function(user) {
				if (user) {
					user.quitPaper(paper_idx, function() {
						res.render('text.ejs', {
							text : {
								success : null
							}
						});
					}, function(error) {
						res.render('text.ejs', {
							text : {
								error : error.toString()
							}
						});
					});
				} else {
					res.render('text.ejs', {
						text : {
							error : "not exist user"
						}
					});
				}
			});
		} else {
			res.render('text.ejs', {
				text : {
					error : util.format("%s or %s is nil", user_idx, paper_idx)
				}
			});
		}
	});

	/*
	 * new versiopn of quiting paper
	 */
	app.post("/paper/:id([0-9]+).json", paperWithIdx, function(req, res) {
		var user_idx = Number(req.body["user_idx"]);
		User.userWithIdx(user_idx, function(user) {
			if (user) {
				user.quitPaper(req.paper.idx, function() {
					res.json({ success : null });
				}, function(error) {
					res.json({ error : error.toString() });
				});
			} else {
				res.json({ error : "there is no user has idx " + user_idx });
			}
		});
	});
	

	app.all('/paper/imageContent/:id([0-9]+)', function(req, res, next) {
		var content_idx = Number(req.param("id"));
		ImageContent.imageContentWithIdx(content_idx, function(imageContent) {
			req.imageContent = imageContent;
			if (ImageContent) {
				console.log("APP ++ ", imageContent);
				next();
			} else {
				res.render('text.ejs', {
					text : {
						error : "not validate imageContent idx " + content_idx
					}
				});
				next(new Error('cannot find ImageContent ' + content_idx));
			}
		});
	});

	app.del("/paper/ImageContent/:id([0-9]+)", function(req, res) {
		var user_idx = Number(req.body["user_idx"]);
		var image_idx = Number(req.body["image_idx"]);

		if (user_idx && image_idx) {
			Step(function() {
				DBTemplate.query("call deleteImageContent(?)", [image_idx], this);
			}, function(error, results) {
				if (error) {
					console.log(error);
					res.render('text.ejs', {
						text : {
							error : "DB Fetch Fail"
						}
					});
				} else {
					res.render('text.ejs', {
						text : {
							success : null
						}
					});
				}
			});
		}
	});

	/**
	 * 컨텐츠 삭제 옛날버젼
	 */
	app.post("/paper/deleteContent/image", function(req, res) {
		var user_idx = Number(req.body["user_idx"]);
		var image_idx = Number(req.body["image_idx"]);
		if (user_idx && image_idx) {
			ImageContent.imageContentWithIdx(image_idx,function(imageContent){
				if(imageContent){
					imageContent.delete(function(){
						res.json({success:null});
					},function(error){
						res.json({error : error.toString()});
					});
				}
				else{
					res.json({error : "there is no imagecontent has idx" + image_idx});
				}
			});
		}
	});
	app.post("/paper/deleteContent/sound", function(req, res) {
		var user_idx = Number(req.body["user_idx"]);
		var sound_idx = Number(req.body["sound_idx"]);

		if (user_idx && sound_idx) {
			SoundContent.soundContentWithIdx(sound_idx,function(soundContent){
				if(soundContent){
					soundContent.delete(function(){
						res.json({success:null});
					},function(error){
						res.json({error : error.toString()});
					});
				}
				else{
					res.json({error : "there is no imagecontent has idx" + image_idx});
				}
			});
		}
	});
//	console.log(app.routes);
}

module.exports = paperController;
