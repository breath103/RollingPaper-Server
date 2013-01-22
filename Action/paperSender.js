var DBTemplate = require("./DBTemplate.js");
var util       = require("util");
var Step 	   = require("step");
var facebook   = require('facebook-graph');



DBTemplate = new DBTemplate();

var server_ip = "210.122.0.164:8001";


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
						var facebookGraph = new facebook.GraphAPI(user.facebook_accesstoken);
						facebookGraph.putObject(paper.receiver_fb_id,"feed",{ 
								message: util.format('%s님이 %s님에게 "%s" 롤링페이퍼를 선물하셨습니다.',user.name,paper.receiver_name,paper.title), 
							    link : util.format("http://%s/paper?v=%d",server_ip,paper.idx), 
								name: 'Rolling Paper', 
								description: 'RollingPaper'
							} , this);
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
				console.log("Facebook uploda Complete : ",result);
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




