var db = require('../lib/db');
var canvas = require('../lib/canvas');

module.exports = {
	setModelMethods: setModelMethods
};

function setModelMethods(schemas, og) {
	var schemaNames = Object.keys(schemas);

	schemaNames.forEach(function(schemaName) {
		var schema = schemas[schemaName];
		schema.methods = schema.methods || {};
		schema.collectionMethods = schema.collectionMethods || {};
		schema.methods.membersArray = function() {
			var model = this, members = [];
			Object.keys(schema.members).forEach(function(memberName) {
				var member = schema.members[memberName];
				if (memberName !== schema.key) {
					if (member.type && member.key) members.push(member.key);
					else members.push(member);
				}
			});
			return members;
		};
		schema.methods.valuesArray = function() {
			var model = this, values = [];
			Object.keys(schema.members).forEach(function(memberName) {
				var member = schema.members[memberName];
				if (memberName !== schema.key) {
					if (member === "string") values.push("'" + model.get(memberName) + "'");
					else if (member === "date") values.push(model.get(memberName).getTime());
					else if (member === "boolean") values.push(model.get(memberName) ? 1 : 0);
					else if (member === "long") values.push(model.get(memberName));
					else if (member.type && member.key) {
						var child = model.get(memberName);
						values.push(child.get(child.schema.key));
					}
					else values.push(null);
				}
			});
			return values
		};
		schema.methods.getValueForSQL = function(memberName) {
			var model = this, member = schema.members[memberName], value = model.get(memberName);
			if (member === "string") return value && "'" + value + "'" || null;
			else if (member === "date") return value ? value.getTime() : null;
			else if (member === "boolean") return value ? 1 : 0;
			else if (member === "long") return value || null;
			else if (member.key) return value && value.get(value.schema.key) || null;
			else return null;
		};
		schema.methods.load = function(cb) {
			var model = this;
			var query = "SELECT * FROM [" + schema.plural + "] WHERE " + schema.key + "=@key";
			var parameters = [{name: 'key', dataType: db.dataTypes.Int, value: model.get(schema.key)}];
			db.executeSQL(query, parameters, function(err, rows) {
				if (err) cb(err);
				og.add(schema.type, rows[0]);
				//TODO need to loop through child objects and load them??
				cb();
			});

		};
		schema.methods.save = function(cb) {
			var model = this, childObjectsBeingSaved = 0;
			var unsavedChanges = model.unsavedChanges();
			if (!unsavedChanges) return cb();
			var membersToSave = [];
			Object.keys(schema.members).forEach(function(key) {
				var member = this.schema.members[key], candidate;
				if (!member) return;
				if (key === schema.key) return;
				if (unsavedChanges[key]) {
					candidate = model[key];
					if (og.isCollection(candidate)) {
						if (member.cascadeSave) {} //TODO save collection, may need to save after saving this model
						//TODO How to know what to delete??
					}
					else if (member.cascadeSave) {
						membersToSave.push(key);
						saveChild(candidate);
					}
					else membersToSave.push(key);
				}
				else if (member.type && member.key && unsavedChanges[member.key]) {
					membersToSave.push(key);
				}
			}.bind(this));
			readyToSave();

			function saveChild(candidate) {
				if (!candidate.isNewUnsaved() && !candidate.unsavedChanges()) return;
				childObjectsBeingSaved++;
				candidate.save(function() {
					childObjectsBeingSaved--;
					readyToSave();
				});
			}

			function readyToSave() {
				var query, parameters;
				//TODO need to account for SQL injection
				if (childObjectsBeingSaved === 0) {
					if (model.isNewUnsaved()) {
						query = "INSERT INTO [" + schema.plural + "] (";
						query += membersToSave.map(function(memberName) {
							return schema.members[memberName].key || memberName;
						}).join(',');
						query += ") VALUES (";
						query += membersToSave.map(function(memberName) {
							return model.getValueForSQL(memberName)
						});
						query += "); select @@identity as " + schema.key;
					}
					else {
						query = "UPDATE [" + schema.plural + "] SET ";
						query += membersToSave.map(function(memberName) {
							var column = schema.members[memberName].key || memberName;
							var value = model.getValueForSQL(memberName);
							return column + "=" + value;
						}).join(',');
						query += " WHERE " + schema.key + "=@key";
						parameters = [{name: 'key', dataType: db.dataTypes.Int, value: model.get(schema.key)}];
					}
					db.executeSQL(query, parameters, function(err, rows) {
						if (err) cb(err);
						model.applyUnsavedChanges(rows[0]);
						cb();
					});
				}
			}
		};
		schema.collectionMethods.load = function() {};
		schema.collectionMethods.save = function(cb) {
			var collection = this, modelsSaved = 0, error;
			if (collection.length === 0) return cb();
			collection.forEach(function(model) {
				model.save(function(err) {
					if (err) error = err;
					modelsSaved++;
					if (modelsSaved === collection.length) cb(error);
				});
			});
		};
	});

	schemas.assignment.methods.loadTasks = function(groupID, cb) {
		var model = this;
		var query = "SELECT * FROM [Tasks] WHERE canvasAssignmentID=@assignmentID";
		var parameters = [{name: 'assignmentID', dataType: db.dataTypes.Int, value: model.id}];
		if (groupID) {
			query += " AND canvasGroupID=@groupID";
			parameters.push({name: 'groupID', dataType: db.dataTypes.Int, value: groupID});
		}
		db.executeSQL(query, parameters, function(err, rows) {
			if (err) return cb(err);
			var tasks = og.add('task', rows);
			var tasksLoaded = 0;
			if (tasks.length === 0) doneLoading();
			tasks.forEach(function(task) {
				task.loadTaskAssignments(function(err) {
					tasksLoaded++;
					doneLoading();
				});
			});

			function doneLoading() {
				if (tasksLoaded === tasks.length) cb();
			}
		});
	};
	schemas.assignment.methods.loadRubric = function(groupID, cb) {
		var model = this;
		var query = "SELECT * FROM [Rubrics] WHERE canvasAssignmentID=@assignmentID";
		var parameters = [{name: 'assignmentID', dataType: db.dataTypes.Int, value: model.id}];
		db.executeSQL(query, parameters, function(err, rows) {
			if (err) return cb(err);
			if (rows.length === 0) return cb();
			var rubric = og.add('rubric', rows[0]);
			model.rubric = rubric;
			rubric.loadCriterion(groupID, cb);
		});
	};
	schemas.discussion.methods.save = function(cb) {
		var model = this, query, parameters;
		if (this.isNewUnsaved()) {
			query = "INSERT INTO [Discussions] (text, canvasGroupID, taskID) " +
				"VALUES (@text, @canvasGroupID, @taskID); " +
				"select id, created FROM [Discussions] WHERE id=@@identity;";
			parameters = [
				{name: 'text', dataType: db.dataTypes.Text, value: model.text},
				{name: 'canvasGroupID', dataType: db.dataTypes.Int, value: (model.group && model.group.id)},
				{name: 'taskID', dataType: db.dataTypes.Int, value: (model.task && model.task.id)}
			];
		}
		else {
			//Can't change existing discussion
			return cb();
		}

		db.executeSQL(query, parameters, function(err, rows) {
			if (err) return cb(err);
			model.applyUnsavedChanges(rows[0]);
			cb();
		});
	};
	schemas.group.methods.loadMembers = function(cb) {
		var model = this;
		canvas.getGroupMembers(model, function(err, users) {
			if (err) return cb(err);
			users.forEach(function(user) {
				og.add('user', {id: user.id, name: user.name, role: 2, groupID: model.id});
			});
			cb();
		});
	};
	schemas.group.methods.loadInstructor = function(cb) {
		var model = this;
		canvas.getInstructor(model.course, function(err, instructor) {
			if (err) return cb(err);
			og.add('user', {id: instructor.id, name: instructor.name, role: 1, groupID: model.id});
			cb();
		});
	};
	schemas.group.methods.loadDiscussions = function(cb) {
		var model = this;
		var query = "SELECT * FROM [Discussions] WHERE canvasGroupID=@groupID";
		var parameters = [{name: 'groupID', dataType: db.dataTypes.Int, value: model.id}];
		db.executeSQL(query, parameters, function(err, rows) {
			if (err) return cb(err);
			og.add('discussion', rows);
			cb();
		});
	};
	schemas.group.collectionMethods.loadMembers = function(cb) {
		var collection = this, groupsLoaded = 0, error;
		if (collection.length === 0) return cb();
		collection.forEach(function(group) {
			group.loadMembers(function(err) {
				if (err) error = err;
				groupsLoaded++;
				if (groupsLoaded === collection.length) cb(error);
			});
		});
	};
	schemas.group.collectionMethods.loadDiscussions = function(cb) {
		var collection = this, groupsLoaded = 0, error;
		if (collection.length === 0) return cb();
		collection.forEach(function(group) {
			group.loadDiscussions(function(err) {
				if (err) error = err;
				groupsLoaded++;
				if (groupsLoaded === collection.length) cb(error);
			});
		});
	};
	schemas.rubric.methods.loadCriterion = function(groupID, cb) {
		var model = this;
		var query = "SELECT * FROM [RubricCriterion] WHERE rubricID=@rubricID";
		var parameters = [{name: 'rubricID', dataType: db.dataTypes.Int, value: model.id}];
		db.executeSQL(query, parameters, function(err, rows) {
			if (err) return cb(err);
			var criterion = og.add('rubricCriteria', rows);
			var criteriaLoaded = 0;
			if (criterion.length === 0) doneLoading();
			criterion.forEach(function(criteria) {
				criteria.loadRatings(groupID, function(err) {
					criteriaLoaded++;
					doneLoading();
				});
			});

			function doneLoading() {
				if (criteriaLoaded === criterion.length) cb();
			}
		});
	};
	schemas.rubric.methods.save = function(cb) {
		var model = this, query, parameters;
		if (model.get("deleted")) {
			query = "DELETE FROM [Rubrics] WHERE id=@key";
		}
		else if (this.isNewUnsaved()) {
			query = "INSERT INTO [Rubrics] (title, canvasAssignmentID) " +
				"VALUES (@title, @canvasAssignmentID); " +
				"select @@identity as id;";
		}
		else {
			query = "UPDATE [Rubrics] SET " +
				"title=@title, canvasAssignmentID=@canvasAssignmentID " +
				"WHERE id=@key";
		}
		parameters = [
			{name: 'key', dataType: db.dataTypes.Int, value: model.id},
			{name: 'title', dataType: db.dataTypes.NVarChar, value: model.title},
			{name: 'canvasAssignmentID', dataType: db.dataTypes.Int, value: (model.assignment && model.assignment.id)}
		];
		db.executeSQL(query, parameters, function(err, rows) {
			if (err) return cb(err);
			if (model.get("deleted")) {
				model.erase();
				cb();
			}
			else {
				model.applyUnsavedChanges(rows[0]);
				model.criterion.save(cb);
			}
		});
	};
	schemas.rubricCriteria.methods.loadRatings = function(groupID, cb) {
		var model = this;
		var query = "SELECT * FROM [RubricRatings] WHERE rubricCriteriaID=@criteriaID";
		var parameters = [{name: 'criteriaID', dataType: db.dataTypes.Int, value: model.id}];
		if (groupID) {
			query += " AND canvasGroupID=@groupID";
			parameters.push({name: 'groupID', dataType: db.dataTypes.Int, value: groupID});
		}
		db.executeSQL(query, parameters, function(err, rows) {
			if (err) return cb(err);
			og.add('rubricRating', rows);
			cb();
		});
	};
	schemas.rubricCriteria.methods.save = function(cb) {
		var model = this, query, parameters;
		if (model.get("deleted")) {
			query = "DELETE FROM [RubricCriterion] WHERE id=@key";
		}
		else if (model.isNewUnsaved()) {
			query = "INSERT INTO [RubricCriterion] (rubricID, description, totalPoints) " +
				"VALUES (@rubricID, @description, @totalPoints); " +
				"select @@identity as id;";
		}
		else {
			query = "UPDATE [RubricCriterion] SET " +
				"rubricID=@rubricID, description=@description, totalPoints=@totalPoints " +
				"WHERE id=@key";
		}
		parameters = [
			{name: 'key', dataType: db.dataTypes.Int, value: model.id},
			{name: 'rubricID', dataType: db.dataTypes.Int, value: model.rubric.id},
			{name: 'description', dataType: db.dataTypes.NVarChar, value: model.description},
			{name: 'totalPoints', dataType: db.dataTypes.Decimal, value: model.totalPoints}
		];
		db.executeSQL(query, parameters, function(err, rows) {
			if (err) return cb(err);
			if (model.get("deleted")) {
				model.erase();
				cb();
			}
			else {
				model.applyUnsavedChanges(rows[0]);
				model.ratings.save(cb);
			}
		});
	};
	schemas.rubricCriteria.collectionMethods.save = function(cb) {
		var collection = this, criteriaSaved = 0, error;
		if (collection.length === 0) return cb();
		collection.forEach(function(criteria) {
			criteria.save(function(err) {
				if (err) error = err;
				criteriaSaved++;
				if (criteriaSaved === collection.length) cb(error);
			});
		});
	};
	schemas.rubricRating.methods.save = function(cb) {
		var model = this, query, parameters;
		if (model.isNewUnsaved()) {
			query = "INSERT INTO [RubricRatings] (rubricCriteriaID, canvasGroupID, description, points) " +
				"VALUES (@rubricCriteriaID, @canvasGroupID, @description, @points); " +
				"select @@identity as id;";
		}
		else {
			query = "UPDATE [RubricRatings] SET " +
				"rubricCriteriaID=@rubricCriteriaID, canvasGroupID=@canvasGroupID, description=@description, points=@points " +
				"WHERE id=@key";
		}
		parameters = [
			{name: 'key', dataType: db.dataTypes.Int, value: model.id},
			{name: 'rubricCriteriaID', dataType: db.dataTypes.Int, value: model.rubricCriteria.id},
			{name: 'canvasGroupID', dataType: db.dataTypes.Int, value: (model.group && model.group.id)},
			{name: 'points', dataType: db.dataTypes.Decimal, value: model.points}
		];
		db.executeSQL(query, parameters, function(err, rows) {
			if (err) return cb(err);
			model.applyUnsavedChanges(rows[0]);
			cb();
		});
	};
	schemas.rubricRating.collectionMethods.save = function(cb) {
		var collection = this, ratingSaved = 0, error;
		if (collection.length === 0) return cb();
		collection.forEach(function(rating) {
			rating.save(function(err) {
				if (err) error = err;
				ratingSaved++;
				if (ratingSaved === collection.length) cb(error);
			});
		});
	};
	schemas.task.methods.loadTaskAssignments = function(cb) {
		var model = this;
		var query = "SELECT * FROM [TaskAssignments] WHERE taskID=@taskID";
		var parameters = [{name: 'taskID', dataType: db.dataTypes.Int, value: model.id}];
		db.executeSQL(query, parameters, function(err, rows) {
			if (err) return cb(err);
			og.add('taskAssignment', rows);
			cb();
		});
	};
	schemas.task.methods.loadDiscussions = function(cb) {
		var model = this;
		var query = "SELECT * FROM [Discussions] WHERE taskID=@taskID";
		var parameters = [{name: 'taskID', dataType: db.dataTypes.Int, value: model.id}];
		db.executeSQL(query, parameters, function(err, rows) {
			if (err) return cb(err);
			og.add('discussion', rows);
			cb();
		});
	};
	schemas.task.methods.save = function(cb) {
		var model = this, query, parameters;
		if (model.get("deleted")) {
			query = "DELETE FROM [Tasks] WHERE id=@key";
		}
		else if (this.isNewUnsaved()) {
			query = "INSERT INTO [Tasks] (name, description, canvasAssignmentID, startDate, endDate, canvasGroupID, groupTask) " +
				"VALUES (@name, @description, @canvasAssignmentID, @startDate, @endDate, @canvasGroupID, @groupTask); " +
				"select @@identity as id;";
		}
		else {
			query = "UPDATE [Tasks] SET " +
				"name=@name, description=@description, canvasAssignmentID=@canvasAssignmentID, startDate=@startDate, endDate=@endDate, canvasGroupID=@canvasGroupID, groupTask=@groupTask " +
				"WHERE id=@key";
		}
		parameters = [
			{name: 'key', dataType: db.dataTypes.Int, value: model.id},
			{name: 'name', dataType: db.dataTypes.NVarChar, value: model.name},
			{name: 'description', dataType: db.dataTypes.NVarChar, value: model.description},
			{name: 'canvasAssignmentID', dataType: db.dataTypes.Int, value: (model.assignment && model.assignment.id)},
			{name: 'startDate', dataType: db.dataTypes.Date, value: model.startDate},
			{name: 'endDate', dataType: db.dataTypes.Date, value: model.endDate},
			{name: 'canvasGroupID', dataType: db.dataTypes.Int, value: (model.group && model.group.id)},
			{name: 'groupTask', dataType: db.dataTypes.Bit, value: model.groupTask}
		];
		db.executeSQL(query, parameters, function(err, rows) {
			if (err) return cb(err);
			if (model.get("deleted")) {
				model.erase();
				cb();
			}
			else {
				model.applyUnsavedChanges(rows[0]);
				model.taskAssignments.save(cb);
			}
		});
	};
	schemas.task.collectionMethods.loadDiscussions = function(cb) {
		var collection = this, tasksLoaded = 0, error;
		if (collection.length === 0) return cb();
		collection.forEach(function(task) {
			task.loadDiscussions(function(err) {
				if (err) error = err;
				tasksLoaded++;
				if (tasksLoaded === collection.length) cb(error);
			});
		});
	};
	schemas.taskAssignment.methods.save = function(cb) {
		var model = this, query, parameters;
		if (model.isNewUnsaved()) {
			query = "INSERT INTO [TaskAssignments] (taskID, canvasUserID, status) " +
				"VALUES (@taskID, @canvasUserID, @status); " +
				"select @@identity as id;";
		}
		else {
			query = "UPDATE [TaskAssignments] SET " +
				"taskID=@taskID, canvasUserID=@canvasUserID, status=@status " +
				"WHERE id=@key";
		}
		parameters = [
			{name: 'key', dataType: db.dataTypes.Int, value: model.id},
			{name: 'taskID', dataType: db.dataTypes.Int, value: (model.task && model.task.id)},
			{name: 'canvasUserID', dataType: db.dataTypes.Int, value: (model.user && model.user.id)},
			{name: 'status', dataType: db.dataTypes.TinyInt, value: model.status}
		];
		db.executeSQL(query, parameters, function(err, rows) {
			if (err) cb(err);
			model.applyUnsavedChanges(rows[0]);
			cb();
		});
	};
	schemas.taskAssignment.collectionMethods.save = function(cb) {
		var collection = this, assignmentSaved = 0, error;
		if (collection.length === 0) return cb();
		collection.forEach(function(assignment) {
			assignment.save(function(err) {
				if (err) error = err;
				assignmentSaved++;
				if (assignmentSaved === collection.length) cb(error);
			});
		});
	};
}