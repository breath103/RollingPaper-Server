/**
 * @author user
 */
var DBTemplate = require("./DBTemplate.js");
var Step	   = require("step");
var fs 		   = require("fs");
var util       = require("util");







function initObjectWithDict(object,dict){
	for(var key in dict){
		if(typeof(dict[key]) != "function") 
			object[key] = dict[key];
	}
}

function Model(){
	
}
Model.prototype = {
	setWithDict : function(dict){
		initObjectWithDict(this,dict);
	}
};


function User(dict){
	if(dict) 
		initObjectWithDict(this,dict);
}
User.allUsers = function(success){
	DBTemplate.getSingleton().query("select * from USER",
	[],
	function(error,results){
		if(error)
			throw error;
		else{
			success(User.usersWithDictArray(results));
		}	
	});
}
User.userWithIdx = function(id,success){
	if(Number(id)){
		DBTemplate.getSingleton().query("select * from USER where idx = ?",
									[id],
									function(error, results) {
										if (error) {
											success(null);
										} else {
											if(results && results[0])
												success(new User(results[0]));
											else 
												success(null);
										}
									});	
	}
	else 
		success(null);
	
};
User.usersWithFacebookIDs = function(facebook_ids,callback){	
	DBTemplate.getSingleton().query(util.format("select * from USER where facebook_id IN (%s) ",facebook_ids.join(",")),[],
		function(error,results) { 
			if(error){
				console.log(error);
				callback();
			}
			else{
				callback(User.usersWithDictArray(results));
			}
		});	
};
User.usersWithDictArray = function(array){
	for(var index in array){
		array[index] = new User(array[index]);	
	}
	return array;
}
User.userWithFacebookID = function(facebook_id,success){
	DBTemplate.getSingleton().query("select * from USER where facebook_id=?",
									[facebook_id],
									function(error, results) {
										if (error) {
											success(null);
										} else {
											if(results && results[0])
												success(new User(results[0]));
											else 
												success(null);
										}
									});
};
User.userWithEmail = function(email,success){
	DBTemplate.getSingleton().query("select * from USER where email=?",
									[email],
									function(error, results) {
										if (error) {
											success(null);
										} else {
											if(results && results[0])
												success(new User(results[0]));
											else 
												success(null);
										}
									});	
};

User.insert = function(user,success){
	DBTemplate.getSingleton().insert("USER",user,function(error,results){
		if(error){
			success(null);
		}
		else{
			User.userWithIdx(results.insertId,function(user){
				success(user);
			});
		}
	});
}

User.prototype = Model.prototype;
User.prototype.constructor = User;
User.prototype = {
	getParticipatingPapers : function(success,failure){
		DBTemplate.getSingleton().query("call getAllParticipatingPapers(?)",
										[this.idx],
										function(error,results) {
											if(error){
												failure(error);
											} 
											else {
												console.log("++++" , results);
												success(results[0]);
											}
										});
	},
	getReceivedPapers : function (success,failure){
		DBTemplate.getSingleton().query("call getUserReceivedPapers(?)",
										[this.idx],
										function(error,results) {
											if(error){
												failure(error);
											} 
											else {
												var stack = new Error().stack;
												console.log( stack );
												success(results[0]);
											}
										});
	},
	getSendedPapers : function(success,failure){
		DBTemplate.getSingleton().query("call getUserSendedPapers(?)",
										[this.idx],
										function(error,results) {
											if(error){
												failure(error);
											} 
											else {
												success(results[0]);
											}
										});
	},
	quitPaper : function(paper_idx,success,failure){
		DBTemplate.getSingleton().query("call QuitRoom(?,?)",
						[this.idx,paper_idx],
						function(error,results) {
						 	if(error) {
								failure(error);
							}
							else{
								console.log(results);
								success();
							}
						});
	}
};


function Paper(dict) {
	if(dict)
		initObjectWithDict(this,dict);
}
Paper.prototype = Model.prototype;
Paper.prototype.constructor = Paper;
Paper.model = {
	table_name : "ROLLING_PAPER",
	primary_key : "idx",
	fields : {
		"idx" : {
			type : Number
		}	
	}
}
Paper.insert = function(paper,success,failure){
	DBTemplate.getSingleton().query("call createRollingPaper(?,?,?,?,?,?,?,?)",
					[paper.creator_idx,
					paper.title,
					paper.target_email,
					paper.notice,
					paper.receiver_fb_id,
					paper.receiver_name,
					paper.receive_time,
					paper.background],
		    		function(error,results){ 
					 	if(error){
					 		failure(error);
					 	}
						else{
							success(results[0][0]);
						}
					});
};
Paper.findAll = function(success,failure){
	DBTemplate.getSingleton().query("select * from ROLLING_PAPER",
					[],
		    		function(error,results){ 
					 	if(error){
					 		failure(error);
					 	}
						else{
							success(results);
						}
					});
		
};
Paper.findWithEmail = function(success,failure){
	
}
Paper.getCompletePaperWithID = function(id,success,failure){
	DBTemplate.getSingleton().query("call getPaperForWebView(?)", 
		[id], 
		function(error, results) {
			console.log(error,results);
			if (error) {
				failure(error);	
			}else if (results.length > 1 && 
					  results[0] && 
					  results[0][0] && 
					  results[0][0].error) {
				success(null);
			} else {
				var paper = results[0][0];
				paper["participants"] = results[1];
				paper["contents"] = {
					image : results[2],
					text : results[3],
					sound : results[4]
				};
				success(paper);
			}
		}
	);
};

Paper.paperWithIdx = function(idx,success){
	DBTemplate.getSingleton().query("select * from ROLLING_PAPER where idx = ?",
									[idx],
									function(error, results) {
										if (error) {
											success(null);
										} else {
											if(results && results[0])
												success(new Paper(results[0]));
											else 
												success(null);
										}
									});
};
Paper.update = function(paper,success,failure){
	DBTemplate.getSingleton().update("ROLLING_PAPER","idx",paper,function(error,results){
		if(error)
			failure(error);
		else 
			success(paper);
	});
};

Paper.prototype = {
	/*
	 * @param [Function] function success(users){...}
	 */
	getParticipants : function(success,failure){
		DBTemplate.getSingleton().query("call getParticipants(?)",[this.idx],function(error,results) {
			if(error){
				failure(error);
			}
			else{
				success(results[0]);
			}
		});
	},
	setFields : function(json){
		var updateableFields = [
			"background",
			"width",
			"height",
			"notice",
			"receive_tel",
			"receive_time",
			"receiver_fb_id",
			"receiver_name",
			"target_email",
			"title"
		];
		var self = this;
		updateableFields.forEach(function(v,i){
			if(json[v]!=undefined)
			{
				self[v] = json[v];
				console.log(self[v],v,json[v]);
			}
		});
	}
};


function ImageContent(dict){
	if(dict) 
		initObjectWithDict(this,dict);
}

ImageContent.prototype = Model.prototype;
ImageContent.prototype.constructor = ImageContent;
ImageContent.imageContentWithIdx = function(id,success){
	DBTemplate.getSingleton().query("select * from IMAGE_CONTENT where idx = ?",
									[id],
									function(error, results) {
										if (error) {
											success(null);
										} else {
											if(results && results[0])
												success(new ImageContent(results[0]));
											else 
												success(null);
										}
									});
};
ImageContent.deleteWithIdx = function(image_idx,success,failure){
	DBTemplate.getSingleton().query("call deleteImageContent(?)", 
	[image_idx],
	function(error, results) {
		if (error) {
			failure(error);
		} else {
			success();
		}
	});
}
ImageContent.update = function(image,success,failure){
	console.log(image);
	DBTemplate.getSingleton().query("call editImageContent(?,?,?,?,?,?,?)", 
		[image.idx, image.x, image.y, image.width, image.height, image.rotation, image.image],
		function(error, results) {
			if (error) {
				failure(error);
			} else {
				success(new ImageContent(results[0][0]));
			}
		});
}
ImageContent.insert = function(params,success){
	var image 	  = params.imageFile;
	var paper_idx = Number(params["paper_idx"]);
	var user_idx  = Number(params["user_idx"]);
	var rotation  = Number(params['rotation']);
	var width     = Number(params["width"]);
	var height    = Number(params["height"]);
	var x 	   	  = Number(params['x']);
	var y 		  = Number(params['y']);
	
	var imageType = image.type.split("/")[1];
	var new_file_name = util.format("%s_%s_%s.%s",user_idx ,paper_idx ,(new Date()).getTime() ,imageType );
	var target_path = util.format("%s/resources/uploads/%s",__dirname,new_file_name);
	
	Step(
		function(){
			fs.rename(image.path, 
					  target_path , 
			  	      this);
	    },function(error){
		    if(error)
	    		throw error;
	    	else
	    		DBTemplate.getSingleton().query("call insertImageContent(?,?,?,?,?,?,?,?)",
												[paper_idx,user_idx,x,y,width,height,rotation, 
												util.format("http://localhost/uploads/%s",new_file_name)],
												this);
	    },function(error,results){
	    	console.log("DB : ",error,results);
	    	if(error)
	    		throw error;
	    	else
	    		success(new ImageContent(results[0][0]));
	    }
	);
};
ImageContent.prototype = {
	delete : function(success,failure){
		ImageContent.deleteWithIdx(this.idx,success,failure);
	}
};


function SoundContent(dict){
	if(dict) 
		initObjectWithDict(this,dict);
}
SoundContent.prototype = Model.prototype;
SoundContent.prototype.constructor = SoundContent;
SoundContent.insert = function(params,success){
	var sound 	  = params.soundFile;
	var paper_idx = Number(params["paper_idx"]);
	var user_idx  = Number(params["user_idx"]);
	var rotation  = Number(params['rotation']);
	var width     = Number(params["width"]);
	var height    = Number(params["height"]);
	var x 	   	  = Number(params['x']);
	var y 		  = Number(params['y']);
	
	var soundType = sound.type.split("/")[1];
	var new_file_name = util.format("%s_%s_%s.%s",user_idx ,paper_idx ,(new Date()).getTime() ,soundType );
	var target_path = util.format("%s/resources/uploads/%s",__dirname,new_file_name);
	
	Step(
		function(){
			fs.rename(sound.path, 
					  target_path , 
			  	      this);
	    },function(error){
	    	if(error)
	    		throw error;
	    	else
	    		DBTemplate.getSingleton().query("call insertSoundContent(?,?,?,?,?)", 
	    										[paper_idx, user_idx, x, y, 
	    											util.format("http://localhost/uploads/%s", new_file_name)],
												this);
	    },function(error,results){
	    	if(error)
	    		throw error;
	    	else
	    		success(new SoundContent(results[0][0]));
	    }
	);
};
SoundContent.update = function(sound,success,failure){
	console.log(sound);
	DBTemplate.getSingleton().query("call editSoundContent(?,?,?,?,?,?,?)", 
			[sound.idx, sound.x, sound.y, sound.width, sound.height, sound.rotation, sound.sound],
		function(error, results) {
			if (error) {
				failure(error);
			} else {
				success(new SoundContent(results[0][0]));
			}
		});
		
};
SoundContent.soundContentWithIdx = function(id,success){
	DBTemplate.getSingleton().query("select * from SOUND_CONTENT where idx = ?",
									[id],
									function(error, results) {
										if (error) {
											success(null);
										} else {
											if(results && results[0])
												success(new SoundContent(results[0]));
											else 
												success(null);
										}
									});
};
SoundContent.deleteWithIdx = function(sound_idx,success,failure){
	DBTemplate.getSingleton().query("call deleteSoundContent(?)", 
	[sound_idx],
	function(error, results) {
		if (error) {
			failure(error);
		} else {
			success();
		}
	});
};
SoundContent.prototype = {
	delete : function(success,failure){
		SoundContent.deleteWithIdx(this.idx,success,failure);
	}
};




function Notice(dict){
	this.title = dict.title;
	this.text  = dict.text;
}
Notice.getAll = function(success,failure){
	DBTemplate.getSingleton().query("call getAllNotice()",[],
		function(error,results){
			if(error)
				failure(error);
			else
				success(results[0]);
		});
};
Notice.getWithID = function(id,success,failure){
	DBTemplate.getSingleton().query("select * from NOTICE where idx = ?",[id],
		function(error,results){
			if(error)
				failure(error);
			else {
				if(results && results[0])
					success(new Notice(results[0]));
				else{
					failure(new Error("there is no Notice that have id : "+id));
				}
			}
		});	
};
Notice.insert = function(notice,success,failure){
	DBTemplate.getSingleton().query("INSERT INTO NOTICE SET title=?,text=?",
				[notice.title,notice.text],
				function(error,results){
					if(error)
						failure(error);
					else
						success(results);
				});
};
Notice.update = function(notice,success){
	DBTemplate.getSingleton().update("NOTICE","idx",notice,function(error,results){
		if(error)
			success(null);
		else 
			success(notice);
	});
};

Notice.deleteWithID = function(id,success,failure){
	DBTemplate.getSingleton().query("delete from NOTICE where idx = ?",
				[id],
				function(error,results){
					if(error)
						failure(error);
					else
						success(results);
				});
};



var Exports = {
	User   : User,
	Notice : Notice,
	Paper  : Paper ,
	ImageContent : ImageContent,
	SoundContent : SoundContent
};

module.exports = Exports;

