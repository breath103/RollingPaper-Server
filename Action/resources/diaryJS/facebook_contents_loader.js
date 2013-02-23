function initObjectWithDict(object,dict){
	for(var key in dict){
		if(typeof(dict[key]) != "function")
			object[key] = dict[key];
	}
}

function Status(json){
	if(json){
		initObjectWithDict(this,json);
	}
	this.content_type = "Status";
}
Status.prototype = {
	getCreatedTime : function(){
		return new Date(this.time * 1000);
	}
};

function Photo(json){
	if(json){
		initObjectWithDict(this,json);
	}
	this.content_type = "Photo";
}
Photo.prototype = {
	getCreatedTime : function(){
		return new Date(this.created * 1000);
	}
};

function Link(json){
	if(json){
		initObjectWithDict(this,json);
	}
	this.content_type = "Link";
}
Link.prototype = {
	getCreatedTime : function(){
		return new Date(this.created_time * 1000);
	}
};



function FacebookContentsLoader() {

}
FacebookContentsLoader.prototype = {
	getAllStatuses : function(callback) {
		var resultsArray = [];
		function getPostAfterTime(index) {
			var fqlQuery = null;
			fqlQuery = " SELECT message,source,status_id,time " + " FROM status " + " WHERE uid = me() " + " ORDER BY time DESC " + " limit " + index * 100 + "," + 100;
			console.log(fqlQuery);

			FB.api('fql', {
				q : fqlQuery
			}, function(res) {

				if (!res || res.error) {
					callback(res.error,null);
					return;
				}
				if (res && res.data && res.data.length > 0) {
					resultsArray.addArray(res.data);
					getPostAfterTime(index + 1);
				} else {
					resultsArray.forEach(function(v,i){
						resultsArray[i] = new Status(v);
					});
					callback(null,resultsArray);
				}
			});
		}

		getPostAfterTime(0);
	},
	getAllPhotos : function(callback) {
		var resultsArray = [];
		function getPhotoWithIndex(index) {
			var fqlQuery = null;
			fqlQuery = " SELECT object_id,pid,src,src_big,created,target_id,target_type,comment_info,src_small,src_small_width,src_small_height,caption,link,comment_info " + " FROM photo " + " WHERE owner=me() " + 
						" limit " + index * 100 + ","+100;
			console.log(fqlQuery);

			FB.api('fql', {
				q : fqlQuery
			}, function(res) {
				if (!res || res.error) {
					callback(res.error,null);
					return;
				}
				if (res && res.data && res.data.length > 0) {
					console.log("new Data : "+res.data.length);
					resultsArray.addArray(res.data);
					
					console.log("resultsArray  : "+resultsArray.length);
					getPhotoWithIndex(index + 1);
				} else {
					resultsArray.forEach(function(v,i){
						resultsArray[i] = new Photo(v);
					});
					callback(null,resultsArray);
				}
			});
		}

		getPhotoWithIndex(0);
	},
	getAllLinks : function(callback) {
		var resultsArray = [];
		function getLinkWithIndex(index) {
			var fqlQuery = null;
			fqlQuery = " SELECT link_id, owner, owner_comment, created_time, title, summary, url, image_urls FROM link WHERE owner=me() "+ 
						" limit " + index * 100 + ","+100;
			console.log(fqlQuery);
			FB.api('fql', {
				q : fqlQuery
			}, function(res) {
				if (!res || res.error) {
					callback(res.error,null);
					return;
				}
				if (res && res.data && res.data.length > 0) {
					resultsArray.addArray(res.data);
					getLinkWithIndex(index + 1);
				} else {
					resultsArray.forEach(function(v,i){
						resultsArray[i] = new Link(v);
					});
					callback(null,resultsArray);
				}
			});
		}

		getLinkWithIndex(0);
	}
	//SELECT link_id, owner, owner_comment, created_time, title, summary, url, image_urls FROM link WHERE owner=me()
};
