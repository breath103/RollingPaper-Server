
var mysql 	 = require('mysql');
var util 	 = require('util');
var Step     = require("step");

function DBTemplate(){
	var outerThis = this;
	this.client = mysql.createClient({
		host : "dasan.skku.edu",
	    user : "inmunskku",
	    password : "1278"
	});
	
	Step(
		function(){
			outerThis.client.query('USE inmunskku', this);
		},
		function(error, results){
			if(error) {
				console.log("database connect error: " + error);
				return;
			}
			console.log("database Connected");
			console.log(outerThis.client);
		}
	);	
}
DBTemplate.prototype.query = function(query,values,callback){
	this.client.query(query,values,callback);
};
DBTemplate.prototype._select = function(query,values,callback){
	var client = this.client;
	Step(
		function(){
			client.query(query, values, this);
		},
		function(error, results){
	    	if(error) {
	    		console.log("database insert fail " + error);
	    	    client.end();
	    	    return;
	    	}
	    	if(callback)
	    		callback(results);
	    }
	);
};
DBTemplate.prototype._insert = function(query,values,callback){
	var client = this.client;
	Step(
		function(){
			client.query(query, values, this);
		},
		function(error, results){
	    	if(error) {
	    		console.log("database insert fail " + error);
	    	    client.end();
	    	    return;
	    	}
	    	if(callback)
	    		callback(results);
	    }
	);
};
DBTemplate.prototype.select = DBTemplate.prototype._select;
DBTemplate.prototype.insert = function(tableName,data,callback){
	var setArray   = [];
	var valueArray = [];
	for(var key in data){
		setArray.push(util.format(" %s = ? ",key));
		valueArray.push(data[key]);
	}
	
	this._insert(
		util.format(" INSERT INTO %s SET %s",tableName,setArray.join(",")),
		valueArray,
		callback
	);
};

module.exports = DBTemplate;
