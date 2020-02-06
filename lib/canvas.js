"use strict";

var request = require('request');
var Promise = require('bluebird');
var config = require('../config');

Promise.promisifyAll(request);

module.exports = {
	group: group
};

function group(course, user, cb) {
	var options = {
		url: 'http://'+config.canvas.canvasDomain+'/api/v1/courses/'+course.id+'/groups?only_own_groups=true&as_user_id='+user.id,
		headers: {
			'Authorization': 'Bearer ' + config.canvas.canvasAPIKey,
			'Content-Type': 'application/x-www-form-urlencoded'
		}
	};

	return request.getAsync(options).then(function(result){
		if (result.statusCode != 200 || result.headers["content-type"].indexOf('application/json') == -1){
			return Promise.reject(new Error("An error occurred retrieving course sections from Canvas."));
		}
		if (result.headers["content-type"].indexOf('application/json') != -1){
			var theJSON = JSON.parse(result.body);
			if (!Array.isArray(theJSON)){
				return Promise.reject(new Error("An error occurred parsing Canvas response."));
			}
			return Promise.resolve(theJSON);
		}
	});
}


