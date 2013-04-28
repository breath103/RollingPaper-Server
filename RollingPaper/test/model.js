var app	  = require("../app");
var mongoose = app.mongoose;
var model = require("../model")(mongoose);

describe("Models" ,function(){
	var model;
	it("should import models",function(){
		model = require("../model")(mongoose);
		console.log(model);
	});
});