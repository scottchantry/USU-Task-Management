"use strict";

var crypto = require("crypto"),
	config = require("./config"),
	algorithm = 'AES-256-CBC',
	iv = crypto.randomBytes(16);

module.exports = {
	encrypt: function(text){
		if ((typeof text) !== "string") {
			text = text.toString();
		}
		var cipher = crypto.createCipheriv(algorithm, Buffer.from(config.encryptionPassword, 'base64'), iv),
			crypted = cipher.update(text, 'utf8', 'base64');
		crypted += cipher.final('base64');
		return crypted;
	},
	decrypt: function(text){
		var decipher = crypto.createDecipheriv(algorithm, config.encyptionPassword, iv),
			dec = decipher.update(text, 'base64', 'utf8');
		dec += decipher.final('utf8');
		return dec;
	},
	basicAuthenticationEncoder: function(username, password){
		return new Buffer(username+":"+password).toString("base64");
	},
	makeObjectKeysLowercase: function(obj){
		var keys = Object.keys(obj);
		var n = keys.length;
		keys.forEach(function(key){
			if (key === key.toLowerCase()) return;
			obj[key.toLowerCase()] = obj[key];
			delete obj[key];
		});
		return obj;
	},
	formatDate: function(date){
		return ((date.getMonth()+1) < 10 ? '0' : '') + (date.getMonth()+1) + '/' + (date.getDate() < 10 ? '0' : '') + date.getDate() + '/' + date.getFullYear();
	},
	exception: function(err) {
		return {
			exception:{
				message:err.message,
				stack:err.stack
			}
		};
	}
};


