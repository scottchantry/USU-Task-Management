"use strict";

var express = require('express');
var router = express.Router();
var utils = require('../utils');

/* GET / */
router.get('/service/session', function(req, res, next) {
	var sessionID = req.session.id, sessionCache = sessions[sessionID];
	res.json(sessionCache.og.sessions.at(0).serialize([], []));
});

/* POST */
router.post('/service/discussion', function(req, res, next) {
	var sessionID = req.session.id, sessionCache = sessions[sessionID];
	//TODO privilege check
	var discussions = sessionCache.og.add(req.body).discussions;
	discussions.save(function(err) {
		if (err) res.json(utils.exception(err));
		else res.json(discussions.serialize()[0]);
	});
});

router.post('/service/rubric', function(req, res, next) {
	var sessionID = req.session.id, sessionCache = sessions[sessionID];
	//TODO privilege check
	var rubrics = sessionCache.og.add(req.body).rubrics;
	rubrics.save(function(err) {
		if (err) res.json(utils.exception(err));
		else res.json(rubrics.serialize()[0]);
	});
});

router.post('/service/task', function(req, res, next) {
	var sessionID = req.session.id, sessionCache = sessions[sessionID];
	//TODO privilege check
	var tasks = sessionCache.og.add(req.body).tasks;
	tasks.save(function(err) {
		if (err) res.json(utils.exception(err));
		else res.json(tasks.serialize()[0]);
	});
});

module.exports = router;
