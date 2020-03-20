var express = require('express');
var router = express.Router();
var OAuth = require('oauth-1.0a');
var canvas = require('../lib/canvas');
var config = require('../config');
var url = require('url');
var crypto = require('crypto');
var utils = require('../utils');
//var mail = require('../lib/mail');

/* /lti */
router.get('/', function(req, res) {
	res.send("USU Task Management LTI App. Please add this tool as an LTI application.");
});
router.post('/', function(req, res) {
	//console.log(req.body);
	var result = validateOAuthSignature(req.body);
	if (result instanceof Error) {
		result.status = 401;
		//mail.sendMail(result, req.body);
		throw result;
	}

	loadSession(req.session.id, mapCanvasData(req.body), function(err, sessionModel) {
		res.redirect('/app/index.html');
	});

});

function loadSession(sessionID, canvasData, cb) {
	var sessionCache = sessions[sessionID], sessionModel;
	var tasksLoaded = false, groupsLoaded = false, taskDiscussionsLoaded = false, groupDiscussionsLoaded = false,
		rubricLoaded = false, instructorLoaded = false;

	var getAllGroups = (canvasData.roleID === 1);
	canvas.getCourseGroup({id: canvasData.canvasCourseID}, {id: canvasData.canvasUserID}, getAllGroups, function(err, result) {
		var groups = result.map(function(group) {
			return {id: group.id, name: group.name, courseID: group.course_id};
		});

		sessionModel = sessionCache.og.add('session', {
			id: sessionCache.session.id,
			user: {id: canvasData.canvasUserID, name: canvasData.canvasUserName, role: canvasData.roleID},
			course: {id: canvasData.canvasCourseID, name: canvasData.canvasCourseTitle},
			assignment: {
				id: canvasData.canvasAssignmentID,
				name: canvasData.canvasAssignmentTitle,
				courseID: canvasData.canvasCourseID
			},
			groups: groups
		}, function(model) {
			var onlyForGroupID;
			model._set('users', sessionCache.og.users);
			if (canvasData.roleID === 1) { //Instructor
				instructorLoaded = true;
			}
			else if (canvasData.roleID === 2) {
				onlyForGroupID = model.groups.at(0).id;
				model.groups.at(0).loadInstructor(function() {
					instructorLoaded = true;
					doneLoading();
				});
			}
			model.groups.loadMembers(function() {
				groupsLoaded = true;
				doneLoading();
			});
			model.assignment.loadTasks(onlyForGroupID, function() {
				tasksLoaded = true;
				model.assignment.tasks.loadDiscussions(function() {
					taskDiscussionsLoaded = true;
					doneLoading();
				});
			});
			model.assignment.loadRubric(onlyForGroupID, function() {
				rubricLoaded = true;
				doneLoading();
			});
			model.groups.loadDiscussions(function() {
				groupDiscussionsLoaded = true;
				doneLoading();
			});

		});
	});

	function doneLoading() {
		if (tasksLoaded && groupsLoaded && taskDiscussionsLoaded && groupDiscussionsLoaded && rubricLoaded && instructorLoaded) cb(null, sessionModel);
	}

}

function mapCanvasData(canvasData) {
	/*
	roles: 'Learner' or 'Instructor'
	lis_person_name_full: 'Jenalee Chantry',
	custom_canvas_user_id: '3',
	custom_canvas_course_id: '1',
	context_title: 'Sample Course 101',
	custom_canvas_assignment_id: '1',
	custom_canvas_assignment_title: 'Test',
   */
	return {
		canvasUserID: canvasData.custom_canvas_user_id,
		canvasUserName: canvasData.lis_person_name_full,
		canvasCourseID: canvasData.custom_canvas_course_id,
		canvasCourseTitle: canvasData.context_title,
		canvasAssignmentID: canvasData.custom_canvas_assignment_id,
		canvasAssignmentTitle: canvasData.custom_canvas_assignment_title,
		roleID: (canvasData.roles === 'Instructor' ? 1 : 2)
	}
}

function validateOAuthSignature(body) {
	var authenticSignature = body.oauth_signature;
	var theData = {};
	Object.keys(body).forEach(function(key) {
		if (key !== "oauth_signature") {
			theData[key] = body[key];
		}
	});

	var oauth = OAuth({
		consumer: {
			key: config.canvas.consumerKey,
			secret: config.canvas.sharedSecret
		},
		signature_method: body.oauth_signature_method,
		hash_function: hash_function_sha1
	});
	var token = {
		public: '',
		secret: ''
	};
	var request_data = {
		url: config.appURL + '/lti',
		method: 'POST',
		data: theData
	};
	var result = oauth.authorize(request_data, token);

	if (result.oauth_signature !== authenticSignature) {
		return new Error("OAuth authentication unsuccessful. Please contact support for assistance.");
	}

	if (false && theData.roles.indexOf('Instructor') === -1) {
		return new Error("This tool is only available to the Teacher of this course.");
	}

	return null;

	function hash_function_sha1(base_string, key) {
		return crypto
		.createHmac('sha1', key)
		.update(base_string)
		.digest('base64')
	}
}

module.exports = router;
