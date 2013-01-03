var http 	   = require('http');
var express    = require('express');
var app        = express();
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

DBTemplate = new DBTemplate();

(function(){
	var paper_idx   = 2;
	var after_time  = 0;
	
	var contentsResults = {};
	Step(function(){
		DBTemplate.query("call getPaperForWebView(1)",[],this);
	},function(error,results){
		console.log(results);
	});
	/*
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
		*/
})();
