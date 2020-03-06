var express = require('express');
var router = express.Router();

/* GET / */
router.get('/', function(req, res, next) {
	res.send("USU Task Management LTI App. Please add this tool as an LTI application.");
});

module.exports = router;
