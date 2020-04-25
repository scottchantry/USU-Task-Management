'use strict';

module.exports = {
	env: 'development', // 'production' for production mode
	appURL: 'http://usutaskapp.ddns.net', //Fully qualified url to this app.  Must match the url in the external tool exactly (Case-sensitive)
	encryptionPassword: '47D8Qpj8HCSa+/TImW+5JCeuQeZkm5NMpJWZG3hSuFU=', //A random Base64 password for encrypting information in ajax calls
	canvas: {
		consumerKey: 'TaskApp', //External Tool consumer key
		sharedSecret: 'ytnD2x954', //External Tool shared secret
		canvasDomain: 'canvaslms.ddns.net', //'canvas.instructure.com'
		canvasAPIKey: 'fYtkGuhWXhLWYafcP8EhFLmeQqkikcKSWIMqK8eVtKjqEpv7f6jlqbddHP17TMvp' //Your canvas API key for an account admin
	},
	db: {
		type: 'mssql', //'mysql', 'mssql', 'oracle'
		host: 'localhost', //host name or ip of database server that will host log table (use double backslash if adding instancename for mssql)
		port: 1433, //TCP port number to use when connecting to server (not required if using mssql instance)
		instance: 'SQLEXPRESS', //MSSQL instanceName or Oracle SID/Service Name
		name: 'USUTaskApp', //database name
		username: 'taskapp', //database username
		password: 'yourPassword', //database password
		isUTC: false //true if database stores time in UTC, false if local time
	}
};