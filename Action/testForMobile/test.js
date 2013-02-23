var Model = require("../model.js");
var User  = Model.User;

var assert = require("assert");
var should = require("should");
describe('Notice API', function(){
	describe('/Notice.json', function(){
    	it('should return whole list Of Notice', function(done){
    		var http = require('http');
			var options = {
				hostname: '210.122.0.119',
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
		var Users = null;
		it("should return whole list Of User",function(done){
			User.allUsers(function(users){
				Users = users;
				users.should.be.an.instanceOf(Array);
				for(var key in users){
					users[key].should.be.an.instanceOf(User);
				}
				done();
			});
		});
		
		it("should return User that same idx",function(done){
			var testIdx = Users[0].idx;
			User.userWithIdx(testIdx,function(user){
				if(user){
					user.should.be.an.instanceof(User);
					should.equal(testIdx,user.idx);
				}
				done();	
			});
		});
	});
});