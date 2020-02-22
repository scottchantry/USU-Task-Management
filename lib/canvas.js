"use strict";

var request = require('request');
var Promise = require('bluebird');
var config = require('../config');

Promise.promisifyAll(request);

module.exports = {
	getCourseGroup: getCourseGroup,
	getGroupMembers: getGroupMembers
};

function getCourseGroup(course, user, getAllGroups, cb) {
	var requestURL = 'http://'+config.canvas.canvasDomain+'/api/v1/courses/'+course.id+'/groups?as_user_id='+user.id;
	if (!getAllGroups) requestURL += '&only_own_groups=true';

	var options = {
		url: requestURL,
		headers: {
			'Authorization': 'Bearer ' + config.canvas.canvasAPIKey,
			'Content-Type': 'application/x-www-form-urlencoded'
		}
	};

	request.getAsync(options).then(function(result){
		var err, theJSON;
		if (result.statusCode !== 200 || result.headers["content-type"].indexOf('application/json') === -1) {
			err = new Error("An error occurred retrieving group membership from Canvas.");
		}
		if (result.headers["content-type"].indexOf('application/json') !== -1){
			theJSON = JSON.parse(result.body);
			if (!Array.isArray(theJSON)){
				err = new Error("An error occurred parsing Canvas response.");
			}
		}
		cb(err, theJSON);
	});
}

function getGroupMembers(group, cb) {
	var options = {
		url: 'http://'+config.canvas.canvasDomain+'/api/v1/groups/'+group.id+'/users',
		headers: {
			'Authorization': 'Bearer ' + config.canvas.canvasAPIKey,
			'Content-Type': 'application/x-www-form-urlencoded'
		}
	};

	request.getAsync(options).then(function(result){
		var err, theJSON;
		if (result.statusCode !== 200 || result.headers["content-type"].indexOf('application/json') === -1) {
			err = new Error("An error occurred retrieving group members from Canvas.");
		}
		if (result.headers["content-type"].indexOf('application/json') !== -1){
			theJSON = JSON.parse(result.body);
			if (!Array.isArray(theJSON)){
				err = new Error("An error occurred parsing Canvas response.");
			}
		}
		cb(err, theJSON);
	});
}
