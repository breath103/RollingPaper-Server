
var mysql 	 = require('mysql');
var util 	 = require('util');
var Step     = require("step");

function DBTemplate(){
	var outerThis = this;
	this.client = mysql.createConnection({
		host : "127.0.0.1",
	    user : "root",
	    password : "1234",
	    insecureAuth: true,
	    multipleStatements : true
	});
	
	this.client.connect();
/*
connection.query('SELECT 1 + 1 AS solution', function(err, rows, fields) {
  if (err) throw err;

  console.log('The solution is: ', rows[0].solution);
});

connection.end();
*/	
	
	
	Step(
		function(){
			outerThis.client.query('USE RollingPaper', this);
		},
		function(error, results){
			if(error) {
				console.log("database connect error: " + error);
				return;
			}
			console.log("database Connected");
		//	console.log(outerThis.client);
		}
	);	
}
//프로시져를 호출한경우 셀렉트 결과물이 여러개 올수 있다. 이경우를 대비하여 함수를 따로 만든다
DBTemplate.prototype.call =  function(query,values,callback){
	this.client.query(query,values,callback);
};

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
