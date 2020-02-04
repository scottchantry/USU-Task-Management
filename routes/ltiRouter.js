var express = require('express');
var router = express.Router();
var OAuth = require('oauth-1.0a');
//var canvas = require('../lib/canvas');
var config = require('../config');
var url = require('url');
var utils = require('../utils');
//var mail = require('../lib/mail');

/* /lti */
router.get('/', function(req, res){
  res.send("USU Task Management LTI App. Please add this tool as an LTI application.");
});
router.post('/', function(req, res) {
  var result = validateOAuthSignature(req.body);
  if (result instanceof Error){
    result.status=401;
    //mail.sendMail(result, req.body);
    throw result;
  }

  if (req.body.lis_person_sourcedid === undefined){
    req.body.lis_person_sourcedid = '';
    /*canvas.logins(req.body.custom_canvas_user_id).then(function(logins){
      for (var i=0; i<logins.length; i++){
        if (logins[i].sis_user_id !== null){
          req.body.lis_person_sourcedid = logins[i].sis_user_id;
          break;
        }
      }
      returnData();
    });*/
  }
  else returnData();

  function returnData(){
    var data = {
      canvasCourseName: req.body.context_title,
      canvasDomain: req.body.custom_canvas_api_domain,
      canvasCourseID: req.body.custom_canvas_course_id,
      encryptedCourseID: utils.encrypt(req.body.custom_canvas_course_id),
      facultySourcedid: req.body.lis_person_sourcedid,
      encryptedFacultySourcedid: utils.encrypt(req.body.lis_person_sourcedid)
    };

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
      public: config.canvas.consumerKey,
      secret: config.canvas.sharedSecret
    }
  });
  var token = {
    public: '',
    secret: ''
  };
  var request_data = {
    url: config.appURL,
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
}

module.exports = router;
