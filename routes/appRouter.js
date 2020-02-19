"use strict";

var express = require('express');
var router = express.Router();

/* GET / */
router.get('/service/session', function(req, res, next) {
	var sessionID = req.session.id, sessionCache=sessions[sessionID];
	res.json(sessionCache.og.sessions.at(0).serialize([],[]));
});

module.exports = router;
