var Model = require("../model.js");
var User  = Model.User;

var assert = require("assert");
var should = require("should");
describe('Paper Web View Test', function(){
	describe('/paper', function(){
    	it('it should show error for not valid paper idx', function(done){
    		var http = require('http');
			var options = {
				hostname: '210.122.0.119',
		  		path: '/paper?v=hsdafg',
		  		port: '80',
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
					console.log(str);
					done();
				});
			});
			req.end();
    	})
  	})
});
