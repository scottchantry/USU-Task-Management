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
router.get('/', function(req, res){
  res.send("USU Task Management LTI App. Please add this tool as an LTI application.");
});
router.post('/', function(req, res) {
  //console.log(req.body);
  var result = validateOAuthSignature(req.body);
  if (result instanceof Error){
    result.status=401;
    //mail.sendMail(result, req.body);
    throw result;
  }

  var sessionID = req.session.id, session = sessions[sessionID], roleID=(req.body.roles==='Instructor'?1:2);


  canvas.getCourseGroup({id:1}, {id:3}, function(err, result) {
    //console.log("GROUPS: ", result)
    var groups = result.map(function(group) {
      return {id:group.id, name:group.name, courseID:group.course_id};
    });
    session.og.add('session', {
      id:sessionID,
      user:{id:req.body.custom_canvas_user_id, name:req.body.lis_person_name_full},
      course:{id:req.body.custom_canvas_course_id, name:req.body.context_title},
      assignment:{id:req.body.custom_canvas_assignment_id, name:req.body.custom_canvas_assignment_title},
      role:roleID,
      groups:groups
    }, function(model) {
      if (roleID===1) { //Instructor
        //TODO get members for all groups
      }
      else if (roleID===2) model.user.group=model.groups.at(0);

      //TODO load tasks, etc.
      gotoApp();
    });
  });

  function gotoApp() {
    res.redirect('/app/index.html');
  }


/*
  roles: 'Learner' or 'Instructor'
  lis_person_name_full: 'Jenalee Chantry',
  custom_canvas_user_id: '3',
  custom_canvas_course_id: '1',
  context_title: 'Sample Course 101',
  custom_canvas_assignment_id: '1',
  custom_canvas_assignment_title: 'Test',
 */



});

function validateOAuthSignature(body){
  var authenticSignature = body.oauth_signature;
  var theData = {};
  Object.keys(body).forEach(function(key) {
    if (key !== "oauth_signature"){
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
    url: config.appURL+'/lti',
    method: 'POST',
    data: theData
  };
  var result = oauth.authorize(request_data, token);

  if (result.oauth_signature !== authenticSignature){
    return new Error("OAuth authentication unsuccessful. Please contact support for assistance.");
  }

  if (false && theData.roles.indexOf('Instructor') === -1){
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
