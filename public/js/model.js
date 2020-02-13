"use strict";

var model = {
    assignment: {
        key:'id',
        members: {
            id:'long',
            name:'string',
            course:{type:"course", key:"courseID"},
            canvasAssignmentID:'long'
        },
        plural:'assignments'
    },
    course: {
        key:'id',
        members: {
            id:'long',
            name:'string',
            canvasCourseID:'long'
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
            canvasGroupID:'long'
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
            group:{type:"group", key:"groupID"},
        },
        plural:'sessions'
    },
    user: {
        key:'id',
        members: {
            id:'long',
            name:'string',
            canvasUserID:'long'
        },
        plural:'users'
    }
};

if (typeof exports !== 'undefined') exports.model=model;