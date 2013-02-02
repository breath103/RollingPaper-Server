var mysql = require('mysql');
var util = require('util');
var Step = require("step");



function DBTemplate(fConnected) {
	DBSingleton = this;
	
	var outerThis = this;
	this.client = mysql.createConnection({
		host : "127.0.0.1",
		user : "root",
		password : "1234",
		timezone : "local",
		insecureAuth : true,
		multipleStatements : true
	});

	this.tableDescriptions = {};
	this.client.connect();
	Step(function() {
		outerThis.client.query('USE RollingPaper', this);
	}, function(error, results) {
		if (error) {
			console.log("database connect error: " + error);
			return;
		}
		console.log("database Connected");
		if (fConnected)
			fConnected();
	});
}

var DBSingleton = null;
DBTemplate.getSingleton = function(){
	if(!DBSingleton){
		DBSingleton = new DBTemplate();
	}
	return DBSingleton;
};
//프로시져를 호출한경우 셀렉트 결과물이 여러개 올수 있다. 이경우를 대비하여 함수를 따로 만든다
DBTemplate.prototype.call = function(query, values, callback) {
	this.client.query(query, values, callback);
};
DBTemplate.prototype.query = function(query, values, callback) {
	console.log({
		query : query,
		values : values
	});
	this.client.query(query, values, function(error,results){
		if(error)
		{
			throw error;
		}
		callback(error,results);
	});
};
DBTemplate.prototype._select = function(query, values, callback) {
	var client = this.client;
	Step(function() {
		client.query(query, values, this);
	}, function(error, results) {
		if (error) {
			console.log("database insert fail " + error);
			client.end();
			return;
		}
		if (callback)
			callback(results);
	});
};
DBTemplate.prototype._insert = function(query, values, callback) {
	var client = this.client;
	Step(function() {
		client.query(query, values, this);
	}, function(error, results) {
		if (error) {
			console.log("database insert fail " + error);
			client.end();
			return;
		}
		if (callback)
			callback(results);
	});
};
DBTemplate.prototype.select = DBTemplate.prototype._select;
DBTemplate.prototype.insert = function(tableName, data, callback) {
	var setArray = [];
	var valueArray = [];
	for (var key in data) {
		if(typeof(data[key]) != 'function' &&
		   typeof(data[key]) != 'object'){
			   setArray.push(util.format(" %s = ? ", key));
			   valueArray.push(data[key]);
		}
	}

	this.query(util.format("INSERT INTO %s SET %s", tableName, setArray.join(",")), valueArray, callback);
};
DBTemplate.prototype.update = function(tableName, 
									   indexName, 
									   data,
									   callback){
	var indexValue = data[indexName];
	if(data[indexName])
		delete data[indexName];

	var setArray = [];
	var valueArray = [];
	for (var key in data) {
		var type = typeof(data[key]);
		if(type != "function" &&
		   type != "object"){
			setArray.push(util.format(" %s = ? ", key));
			valueArray.push(data[key]);
		}
	}
	// UPDATE `RollingPaper`.`NOTICE` SET `text`='gasdgasdgfasdf' WHERE `idx`='1';

	this.query(util.format("UPDATE %s SET %s WHERE %s = %s", tableName, setArray.join(","),indexName,indexValue,index), 
				valueArray,
				callback);	
}
DBTemplate.prototype.getUserWithIdx = function(idx,success,failure){
	this.query("select * from USER where idx = ?",[idx],function(error,results){
		if(error)
			failure(error);
		else{
			success(results);
		}
	});
};
DBTemplate.prototype.addTableDesc = function(name, desc) {
	this.tableDescriptions[name] = desc;
};
DBTemplate.prototype.getTableDesc = function(name) {
	return tableDescriptions[name];
};
DBTemplate.prototype.deleteContent = function(idx) {
	
};

/**
 *  @param {Number} paper_idx 
 *  @param {Function} success : function(paper){ ... }
 *  @param {Function} failure : function(error){ ... }
 */
DBTemplate.prototype.getPaperAndContents = function(paper_idx, success, failure) {
	this.query("call getPaperForWebView(?)", [paper_idx], function(error, results) {
		if (error) {
			failure(error);	
		}else if (results.length > 1 && results[0] && results[0][0] && results[0][0].error) {
			failure(results);
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
	});
};



/**
 * 
 * @param {Object} data
 * 	data = {
 *		facebook_id,
 *		inviter_idx,
 *		paper_idx 
 *	}
 * @param {Function} success
 * @param {Function} failure
 */
DBTemplate.prototype.createFacebookFriendInvitation = function(data,success,failure){
	this.query("INSERT INTO FACEBOOK_FRIEND_INVITATION SET facebook_id=?, inviter_idx=?, paper_idx=?",
				[data.facebook_id,data.inviter_idx,data.paper_idx],
				function(error,results){
					if(error)
						failure(error);
					else 
						success(results);
				});
};
DBTemplate.prototype.changeFBFriendInvitationToTicket = function(facebook_id,success,failure){
	this.query("call changeFacebookFriendInvitationToTicket(?);",
			   [facebook_id],
			function(error,results){
				if(error)
					failure(error);
				else{
					success(results);
				}
			});
};
DBTemplate.prototype.getNoticeList = function(success,failure){
	this.query("select * from NOTICE",[],
			function(error,results){
				if(error)
					failure(error);
				else
					success(results);
			});
};
/**
 * 
 * @param {Object} data
 * data = { 
 * 		title // 제목,
 * 		text  // 공지사항 내용	
 * };
 * @param {Object} success
 * @param {Object} failure
 */
DBTemplate.prototype.writeNotice = function(data,success,failure){
	this.query("INSERT INTO NOTICE SET title=?,text=?",
				[data.title,data.text],
				function(error,results){
					if(error)
						failure(error);
					else
						success(results);
				});
};
module.exports = DBTemplate;
