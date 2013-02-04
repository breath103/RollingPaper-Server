var Model = require("../model.js");
var User  = Model.User;

var assert = require("assert");
var should = require("should");
describe('Notice API', function(){
	describe('/Notice.json', function(){
    	it('should return whole list Of Notice', function(done){
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
					var results = JSON.parse(str);
					console.log(results);
					results.should.be.an.instanceOf(Array);
					done();
				});
			});
			req.end();
    	})
  	})
});


describe('User API', function(){
	describe('user List API',function(){
		it("should return whole list Of User",function(done){
			done();
		});
		
		it("should return User that same idx",function(done){
			var testIdx = 3;
			User.userWithIdx(testIdx,function(user){
				if(user){
					user.should.be.an.instanceof(User);
					should.equal(testIdx,user.idx);
					console.log(user);
				}
				done();	
			});
		});
	});

});