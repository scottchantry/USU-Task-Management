"use strict";

var express = require('express');
var router = express.Router();

/* GET / */
router.get('/aaa', function(req, res, next) {
	res.send("nothing");
});

module.exports = router;
