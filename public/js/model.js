"use strict";

var model = {
	assignment: {
		key: 'id',
		members: {
			id: 'long',
			name: 'string',
			course: {type: "course", key: "courseID"},
			rubric: {type: "rubric", key: 'rubricID', cascadeSave: true},
			tasks: {plural: "tasks"}
		},
		plural: 'assignments'
	},
	course: {
		key: 'id',
		members: {
			id: 'long',
			name: 'string'
		},
		plural: 'courses'
	},
	/*courseMembership: {
		key:'id',
		members: {
			id:'long',
			user:{type:"user", key:"userID"},
			course:{type:"course", key:"courseID"},
			roleID:'long'
		},
		plural:'courseMemberships'
	},*/
	discussion: {
		key: 'id',
		members: {
			id: 'long',
			created: 'date',
			text: 'string',
			group: {type: 'group', key: 'canvasGroupID', reciprocal: 'discussions'},
			task: {type: 'task', key: 'taskID', reciprocal: 'discussions'}
		},
		plural: 'discussions'
	},
	group: {
		key: 'id',
		members: {
			id: 'long',
			name: 'string',
			course: {type: "course", key: "courseID"},
			members: {plural: "users", cascadeSave: true},
			tasks: {plural: "tasks", cascadeSave: true},
			discussions: {plural: "discussions", cascadeSave: true}
		},
		plural: 'groups'
	},
	/*groupMembership: {
		key:'id',
		members: {
			id:'long',
			user:{type:"user", key:"userID"},
			group:{type:"group", key:"groupID"}
		},
		plural:'groupMemberships'
	},*/
	rubric: {
		key: 'id',
		members: {
			id: 'long',
			title: 'string',
			assignment: {type: 'assignment', key: "canvasAssignmentID"},
			criterion: {plural: "rubricCriterion", cascadeSave: true, cascadeDelete: true}
		},
		plural: 'rubrics'
	},
	rubricCriteria: {
		key: 'id',
		members: {
			id: 'long',
			description: 'string',
			totalPoints: 'long',
			rubric: {type: 'rubric', reciprocal: 'criterion'},
			ratings: {plural: "rubricRatings", cascadeSave: true, cascadeDelete: true}
		},
		plural: 'rubricCriterion',
		bubbleEvents: {to: "rubric"}
	},
	rubricRating: {
		key: 'id',
		members: {
			id: 'long',
			description: 'string',
			points: 'long',
			group: {type: "group", key: "canvasGroupID"},
			rubricCriteria: {type: 'rubricCriteria', reciprocal: 'ratings'}
		},
		plural: 'rubricRatings',
		bubbleEvents: {to: "rubricCriteria"}
	},
	session: {
		key: 'id',
		members: {
			id: 'string',
			created: 'date',
			user: {type: "user", key: "userID", cascadeSave: true},
			course: {type: "course", key: "courseID", cascadeSave: true},
			assignment: {type: "assignment", key: "assignmentID", cascadeSave: true},
			groups: {plural: "groups", cascadeSave: true}
		},
		plural: 'sessions'
	},
	task: {
		key: 'id',
		members: {
			id: 'long',
			name: 'string',
			description: 'string',
			assignment: {type: "assignment", key: "canvasAssignmentID", reciprocal: "tasks"},
			group: {type: "group", key: "canvasGroupID", reciprocal: "tasks"},
			startDate: "date",
			endDate: "date",
			groupTask: "boolean",
			taskAssignments: {plural: "taskAssignments", cascadeSave: true, cascadeDelete: true},
			discussions: {plural: "discussions", cascadeSave: true, cascadeDelete: true}
		},
		methods: {
			formatStartDate: function() {
				return this.startDate.format();
			},
			formatEndDate: function() {
				return this.endDate.format();
			},
			validates: function() {
				var task=this;
				if (!task.name || task.name.length===0) return false;
				if (!task.startDate || !task.endDate) return false;
				if (!task.taskAssignments.validates()) return false;
				return true;
			}
		},
		plural: 'tasks'
	},
	taskAssignment: {
		key: 'id',
		members: {
			id: 'long',
			task: {type: "task", key: "taskID", reciprocal: "taskAssignments"},
			user: {type: "user", key: "canvasUserID"},
			status: "long"
		},
		methods:{
			validates:function() {
				if (!this.user) return false;
				if (!this.status) return false;
				return true;
			}
		},
		collectionMethods:{
			validates:function() {
				return this.every(function(model){return model.validates()})
			}
		},
		plural: 'taskAssignments',
		bubbleEvents: {to: "task"}
	},
	user: {
		key: 'id',
		members: {
			id: 'long',
			name: 'string',
			role: 'long',
			group: {type: "group", key: "groupID", reciprocal: "members"}
		},
		plural: 'users'
	}
};

if (typeof exports !== 'undefined') exports.model = model;