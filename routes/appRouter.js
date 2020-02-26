"use strict";

var express = require('express');
var router = express.Router();

/* GET / */
router.get('/service/session', function(req, res, next) {
	var sessionID = req.session.id, sessionCache=sessions[sessionID];
	res.json(sessionCache.og.sessions.at(0).serialize([],[]));
});

/* POST */
router.post('/service/discussion', function(req, res, next) {
	var sessionID = req.session.id, sessionCache=sessions[sessionID];
	//save discussion
	//res.json(sessionCache.og.sessions.at(0).serialize([],[]));
});

router.post('/service/rubric', function(req, res, next) {
	var sessionID = req.session.id, sessionCache=sessions[sessionID];
	//save rubric
	//res.json(sessionCache.og.sessions.at(0).serialize([],[]));
});

router.post('/service/task', function(req, res, next) {
	var sessionID = req.session.id, sessionCache=sessions[sessionID];
	//save task
	//res.json(sessionCache.og.sessions.at(0).serialize([],[]));
});

module.exports = router;
