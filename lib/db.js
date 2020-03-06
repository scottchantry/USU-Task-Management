"use strict";

var tedious = require('tedious');
var ConnectionPool = require('tedious-connection-pool');
var config = require('../config');
var pool;

module.exports = {
	executeSQL: executeSQL,
	dataTypes: tedious.TYPES
};

function executeSQL(query, parameters, callback) {
	getPoolConnection(function(err, connection) {
		if (err) {return callback(err)}
		if (config.db.type === 'mssql') {
			var request = new tedious.Request(query, function(err, rowCount, rows) {
				var returnRows = [];
				if (err) callback(err);
				else {
					rows.map(function(row) {
						var rowData = {};
						row.forEach(function(rowColumn) {
							rowData[rowColumn.metadata.colName] = rowColumn.value;
						});
						returnRows.push(rowData);
					});
					callback(null, returnRows);
				}
				connection.release();
			});
			if (parameters) {
				parameters.forEach(function(param) {
					request.addParameter(param.name, param.dataType, param.value);
				});
			}
			connection.execSql(request);
		}
	});
}

function getPoolConnection(callback) {
	createPoolConnection(function(err) {
		if (err) return callback(err);
		if (config.db.type === 'mssql') {
			pool.acquire(function(err, conn) {
				if (err) {
					console.log('mssql getConnection() callback: ' + err.message);
					return callback(err);
				}
				else {
					return callback(null, conn);
				}
			});
		}
	});
}

function createPoolConnection(callback) {
	if (pool) {
		return callback();
	}

	if (config.db.type === 'mssql') {
		var poolConfig = {
			min: 10,
			max: 50
		};

		var connectionConfig = {
			server: config.db.host,
			userName: config.db.username,
			password: config.db.password,
			options: {
				database: config.db.name,
				rowCollectionOnRequestCompletion: true,
				useUTC: config.db.isUTC
			}
		};
		if (config.db.instance !== undefined)
			connectionConfig.options.instanceName = config.db.instance;
		else
			connectionConfig.options.port = config.db.port;

		pool = new ConnectionPool(poolConfig, connectionConfig);
		pool.on('error', function(err) {
			console.log(err)
		});
		return callback();
	}
}