"use strict";

var model = {
    assignment: {
        key:'id',
        members: {
            id:'long',
            name:'string',
            course:{type:"course", key:"courseID"}
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
            members:{plural:"users"}
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