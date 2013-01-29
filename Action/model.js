/**
 * @author user
 */
var DBTemplate = require("./DBTemplate.js");

function User(){
	
}
User.userWithIdx = function(idx,success){
	Step(function() {
		DBTemplate.getSingleton().query("select * from USER where idx = ?",[idx],this);
	}, function(error, results) {
		if (error) {
			failure(error);
		} else {
			success(new User(results[0]));
		}
	});
}

User.prototype = {
	getParticipatingPapers : function(success,failure){
		Step(
			function() { 
				DBTemplate.getSingleton().query("call getAllParticipatingPapers(?)",[this.idx],this);
			},
			function(error,results) {
				if(error){
					failure(error);
				} 
				else {
					var paperResults = Paper.fromJSONArray(results[0]);
					success(paperResults);
				}
			}
		);
	}
};


function Paper(dict) {
	
}
Paper.fromJSONArray = function(array){
	for(var index in array){
		array[index] = new Paper(array[index]);
	}
	return array;
}
Paper.prototype = {
	getContents : function(callback){
			
	}	
};


function Content {
	
}
function ImageContent{
	
}
function SoundContent{
	
}


