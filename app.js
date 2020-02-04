var express = require('express');
var path = require('path');
var url = require('url');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var config = require('./config');

var ltiRouter = require('./routes/ltiRouter');
var indexRouter = require('./routes/indexRouter');
var appRouter = require('./routes/appRouter');

var app = express();

app.set('env', config.env);
app.disable('x-powered-by');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(url.parse(config.appURL).pathname+'app', express.static(path.join(__dirname, 'public')));

app.use(url.parse(config.appURL).pathname, indexRouter);
app.use(url.parse(config.appURL).pathname+'lti', ltiRouter);
app.use(url.parse(config.appURL).pathname+'app', appRouter);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
	app.use(function(err, req, res, next) {
		//mail.sendMail(err);
		res.status(err.status || 500);
		res.render('error', {
			message: err.message,
			error: err
		});
	});
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
	//mail.sendMail(err);
	res.status(err.status || 500);
	res.render('error', {
		message: err.message,
		error: {}
	});
});

//Allow Error object to stringify
Object.defineProperty(Error.prototype, 'toJSON', {
	value: function () {
		var alt = {};
		Object.getOwnPropertyNames(this).forEach(function (key) {
			alt[key] = this[key];
		}, this);
		return alt;
	},
	configurable: true
});

module.exports = app;
