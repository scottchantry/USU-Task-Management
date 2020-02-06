'use strict';

module.exports = {
	env: 'development', // 'production' for production mode
	appURL: 'http://localhost:3000', //Fully qualified url to this app.  Must match the url in the external tool exactly (Case-sensitive)
	encryptionPassword: '47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=', //A random Base64 password for encrypting information in ajax calls
	canvas: {
		consumerKey: 'ChiTester', //External Tool consumer key
		sharedSecret: 'jtnDQx934', //External Tool shared secret
		canvasDomain: '192.168.56.101', //'weber.instructure.com'
		canvasAPIKey: 'YwLZDgSbEN1u7qtkQM7JoNJG6xiib6P81Y1cEgHTyiCcxWztjO8g4Uct76kgFkwR' //Your canvas API key for an account admin
	},
	db: {
		type: 'mssql', //'mysql', 'mssql', 'oracle'
		host: '', //host name or ip of database server that will host log table (use double backslash if adding instancename for mssql)
		port: '', //TCP port number to use when connecting to server (not required if using mssql instance)
		instance: '', //MSSQL instanceName or Oracle SID/Service Name
		name: '', //database name
		username: '', //database username
		password: '', //database password
		isUTC: false //true if database stores time in UTC, false if local time
	}
};