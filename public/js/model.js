"use strict";

var model = {
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
    },
    group: {
        key:'id',
        members: {
            id:'long',
            name:'string',
            canvasGroupID:'long'
        },
        plural:'groups'
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
    courseMembership: {
        key:'id',
        members: {
            id:'long',
            user:{type:"user", key:"userID"},
            course:{type:"course", key:"courseID"},
            roleID:'long'
        },
        plural:'courseMemberships'
    },
    groupMembership: {
        key:'id',
        members: {
            id:'long',
            user:{type:"user", key:"userID"},
            group:{type:"group", key:"groupID"}
        },
        plural:'groupMemberships'
    },
    assignment: {
        key:'id',
        members: {
            id:'long',
            name:'string',
            course:{type:"course", key:"courseID"},
            canvasAssignmentID:'long'
        },
        plural:'assignments'
    }
};