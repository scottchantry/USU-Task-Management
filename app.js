var express = require('express');
var path = require('path');
var url = require('url');
var logger = require('morgan');
var session = require('express-session');
var config = require('./config');
var jsdom = require('jsdom');
var ObjectGraph = require('./public/js/lib').ObjectGraph;
var sessionInitializer = function(req, res, next) {
	var sessionID = req.session.id, sessionTimeout;
	if (!sessions[sessionID]) {
		if (req.url.indexOf('/app') === 0) { //Session required for /app path
			if (req.headers.accept && req.headers.accept.indexOf('application/json') >= 0) return res.json({exception: {message: "Session has expired, please log in again."}});
			else return res.send("Your session has expired or hasn't been created yet. Please log in through Canvas.");
		}
		sessions[sessionID] = {
			session: req.session,
			og: new ObjectGraph(),
			resetTimeout: function() {
				clearTimeout(sessionTimeout);
				sessionTimeout = setTimeout(function() {
					sessions[sessionID].session.destroy(function() {
						setImmediate(function() {
							sessions[sessionID] = {expired: true}
						});
					});
				}, 60 * 60 * 1000);
			}
		};
		initializeModel();
		sessions[sessionID].resetTimeout();

		function initializeModel() {
			var model = require('./public/js/model').model;
			require('./model/model').setModelMethods(model, sessions[sessionID].og);
			sessions[sessionID].og.addSchemata(model);
		}
	}
	else sessions[sessionID].resetTimeout();
	next();
};

global.$ = global.jQuery = (require('jquery'))(new jsdom.JSDOM().window);
global.model = require('./public/js/model').model;
global.running = true;
global.sessions = {};

var ltiRouter = require('./routes/ltiRouter');
var indexRouter = require('./routes/indexRouter');
var appRouter = require('./routes/appRouter');

var app = express();

app.set('env', config.env);
app.disable('x-powered-by');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.set('trust-proxy', 1);
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(session({
	secret: config.encryptionPassword,
	resave: false,
	saveUninitialized: true,
	cookie: {}
}));
app.use(sessionInitializer);
app.use(url.parse(config.appURL).pathname + 'app', express.static(path.join(__dirname, 'public')));

app.use(url.parse(config.appURL).pathname, indexRouter);
app.use(url.parse(config.appURL).pathname + 'lti', ltiRouter);
app.use(url.parse(config.appURL).pathname + 'app', appRouter);


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
	value: function() {
		var alt = {};
		Object.getOwnPropertyNames(this).forEach(function(key) {
			alt[key] = this[key];
		}, this);
		return alt;
	},
	configurable: true
});

module.exports = app;
