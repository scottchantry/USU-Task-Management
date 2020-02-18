"use strict";

var express = require('express');
var router = express.Router();

/* GET / */
router.get('/service', function(req, res, next) {
	res.send("nothing");
});

module.exports = router;
