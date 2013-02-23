var Notice = require("./model.js").Notice;

var noticeController = function(app) {
	/**
	 * GET all Notice
	 */
	app.get("/notice.json", function(req, res) {
		Notice.getAll(function(noticeList) {
			res.json(noticeList);
			//res.render('text.ejs', {text : noticeList});
		}, function(error) {
			res.json({ error : error.toString() });
		});
	});

	/**
	 * GET Notice With IDX
	 */
	app.get("/notice/:id.json", function(req, res) {
		Notice.getWithID(req.params['id'], function(notice) {
			res.json(notice);
		}, function(error) {
			res.json({ error : error.toString() });
		});
	});

	/**
	 * POST write the Notice
	 */
	app.post("/notice.json", function(req, res) {
		var notice = new Notice({
			title : req.param("title"),
			text : req.param("text")
		});

		Notice.insert(notice, function(results) {
			res.json({ success : results });
		}, function(error) {
			res.json({ error : error.toString() });
		});
		
	});

	/**
	 * DELETE delete the Notice
	 */
	app.del("/notice/:id.json", function(req, res) {
		Notice.deleteWithID(req.param("id"), function(results) {
			res.json({success:results});
		}, function(error) {
			res.json({ error : error.toString() });
		});
	});

	/**
	 * UPDATE update the notice
	 */
	app.put("/notice/:id.json", function(req, res) {
		var notice_idx = Number(req.params["id"]);
		Notice.getWithID(notice_idx, function(notice) {
			if (notice) {
				notice.setWithDict(req.params);
				Notice.update(notice, function(notice) {
					if (notice)
						res.json({success:notice});
					else
						res.json({error : "there is no Notice with id " + notice_idx});
				});
			} else {
				res.json({error : "there is no Notice with id " + notice_idx});
			}
		});
	});

}

module.exports = noticeController;
