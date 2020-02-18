"use strict";

var model = {
    assignment: {
        key:'id',
        members: {
            id:'long',
            name:'string',
            course:{type:"course", key:"courseID"},
            tasks:{plural:"tasks"}
        },
        plural:'assignments'
    },
    course: {
        key:'id',
        members: {
            id:'long',
            name:'string'
        },
        plural:'courses'
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
    group: {
        key:'id',
        members: {
            id:'long',
            name:'string',
            course:{type:"course", key:"courseID"},
            members:{plural:"users"},
            tasks:{plural:"tasks"}
        },
        plural:'groups'
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
    session: {
        key:'id',
        members: {
            id:'long',
            created:'date',
            user:{type:"user", key:"userID"},
            course:{type:"course", key:"courseID"},
            assignment:{type:"assignment", key:"assignmentID"},
            groups:{plural:"groups"},
            role:'string'
        },
        plural:'sessions'
    },
    task: {
        key:'id',
        members: {
            id:'long',
            name:'string',
            description:'string',
            assignment:{type:"assignment", key:"canvasAssignmentID", reciprocal:"tasks"},
            group:{type:"group", key:"canvasGroupID", reciprocal:"tasks"},
            startDate:"date",
            endDate:"date",
            groupTask:"boolean",
            taskAssignments:{plural:"taskAssignments"}
        },
        plural:'tasks'
    },
    taskAssignment:{
        key:'id',
        members: {
            id:'long',
            task:{type:"task", reciprocal:"taskAssignments"},
            user:{type:"user", key:"canvasUserID"},
            status:"long"
        },
        plural:'taskAssignments'
    },
    user: {
        key:'id',
        members: {
            id:'long',
            name:'string',
            group:{type:"group", key:"groupID"}
        },
        plural:'users'
    }
};

if (typeof exports !== 'undefined') exports.model=model;