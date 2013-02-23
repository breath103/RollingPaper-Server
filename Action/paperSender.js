var DBTemplate = require("./DBTemplate.js");
var util       = require("util");
var Step 	   = require("step");
var facebook   = require('facebook-graph');

var path           = require('path')
  , templatesDir   = path.resolve(__dirname, 'mailTemplates')
  , emailTemplates = require('email-templates')
  , nodemailer     = require('nodemailer');


DBTemplate = new DBTemplate();

var server_ip = "210.122.0.164:8001";

var transport = nodemailer.createTransport("SMTP", {
      service: "Gmail",
      auth: {
        user: "breath103@gmail.com",
        pass: "dltkdgus"
      }
    });




var currentState = "SENDING"
function SendingProcess() {
	if(DBTemplate)
	{
		var paper;
		var user;
		Step(
			function(){
				DBTemplate.call("call getFirstSendablePaper()",[],this);
			},
			function(error,results) {
				if(results && 
				   results[0] && 
				   results[0][0] && 
				   results[1] && 
				   results[1][0]){
				   	paper = results[0][0];
					user  = results[1][0];
					if(paper && user){
						console.log("전송 : ",paper);
						console.log("유저 : ",user);
						currentState = "SENDING";
						
						(function(user,paper){
							transport.sendMail({
					    		from: user.name,
					    		to: "flowithsuelee@gmail.com",
					    		subject: paper.title,
					    		html: util.format("<html>" + 
					    			"<a href = 'http://210.122.0.119:8001/paper?v=%d'>" +
					    				"<img style='width:50%;height:auto' src='http://210.122.0.119:8001/img/email_bg.png'/>" +
					    			"</a>"+
					    		"</html>",paper.idx)
					    	},function(error,results){
					    		console.log(results);
					    	});   
						})(user,paper);
						
						
						    // An example users object with formatted email function
					    var locals = {
					    	email: paper.target_email,
					    	name: {
					        	first: user.name
					        }
					    };
					    if(locals.email){
							transport.sendMail({
					    		from: user.name,
					    		to: locals.email,
					    		subject: paper.title,
					    		html: util.format("<html>" + 
					    			"<a href = 'http://210.122.0.119:8001/paper?v=%d'>" +
					    				"<img style='width:50%;height:auto' src='http://210.122.0.119:8001/img/email_bg.png'/>" +
					    			"</a>"+
					    		"</html>",paper.idx)
					    	},this);    
					    }
					    else{
						    this(NULL,NULL);	    
					    }
					}
				}
				else{
					//현재 보낼데이터가 없는경우
					if(currentState == "SENDING")
					{
						console.log("대기중입니다.......");
						currentState = "WAITING";
					}
					setTimeout(function(){
						SendingProcess();
					}, 100);
				}
			},
			function(error,result){
				if(error) console.log(error);
				console.log("Email Sending uploda Complete : ",result);
				DBTemplate.query("UPDATE ROLLING_PAPER SET is_sended='SENDED' WHERE idx=?;",[paper.idx],this);
			},
			function(error,result){
				if(error) console.log(error);
				
				console.log("DB UPDATE Complete ",result,paper.idx);
				SendingProcess();
			}	
		);
	}
}


SendingProcess();




