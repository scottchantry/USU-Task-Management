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

  var sessionID = req.session.id;


  canvas.getCourseGroup({id:1}, {id:3}, function(err, result) {
    //console.log("GROUPS: ", result)
  });
  //TODO lookup or create user, course, group, etc
/*
  roles: 'Learner' or 'Instructor'
  lis_person_name_full: 'Jenalee Chantry',
  custom_canvas_user_id: '3',
  custom_canvas_course_id: '1',
  context_title: 'Sample Course 101',
  custom_canvas_assignment_id: '1',
  custom_canvas_assignment_title: 'Test',
 */

  returnData();

  function returnData(){
    //TODO use data loaded from my database instead of
    var data = {
      canvasCourseName: req.body.context_title,
      canvasDomain: req.body.custom_canvas_api_domain,
      canvasCourseID: req.body.custom_canvas_course_id,
      encryptedCourseID: utils.encrypt(req.body.custom_canvas_course_id),
      facultySourcedid: req.body.lis_person_sourcedid
    };

    //TODO create some sort of token to pass to UI that can be used to load the current session
    //res.render('index', data);
    res.redirect('/app/index.html?'+new url.URLSearchParams(data).toString())
  }
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
