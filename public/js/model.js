"use strict";

var model = {
    assignment: {
        key:'id',
        members: {
            id:'long',
            name:'string',
            course:{type:"course", key:"courseID"},
            rubric:{type:"rubric", key:'rubricID', cascadeSave:true},
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
    discussion: {
        key:'id',
        members: {
            id:'long',
            created:'date',
            text:'string',
            group:{type:'group', key:'canvasGroupID', reciprocal:'discussions'},
            task:{type:'task', key:'taskID', reciprocal:'discussions'}
        },
        plural:'discussions'
    },
    group: {
        key:'id',
        members: {
            id:'long',
            name:'string',
            course:{type:"course", key:"courseID"},
            members:{plural:"users", cascadeSave:true},
            tasks:{plural:"tasks"},
            discussions:{plural:"discussions", cascadeSave:true}
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
    rubric: {
        key:'id',
        members: {
            id:'long',
            title:'string',
            assignment:{type:'assignment', key:"canvasAssignmentID"},
            criterion:{plural:"rubricCriterion", cascadeSave:true, cascadeDelete:true}
        },
        plural:'rubrics'
    },
    rubricCriteria: {
        key:'id',
        members: {
            id:'long',
            description:'string',
            totalPoints:'long',
            rubric:{type:'rubric', reciprocal:'criterion'},
            ratings:{plural:"rubricRatings", cascadeSave:true, cascadeDelete:true}
        },
        plural:'rubricCriterion'
    },
    rubricRating: {
        key:'id',
        members: {
            id:'long',
            description:'string',
            points:'long',
            rubricCriteria:{type:'rubricCriteria', reciprocal:'ratings'}
        },
        plural:'rubricRatings'
    },
    session: {
        key:'id',
        members: {
            id:'string',
            created:'date',
            user:{type:"user", key:"userID", cascadeSave:true},
            course:{type:"course", key:"courseID", cascadeSave:true},
            assignment:{type:"assignment", key:"assignmentID", cascadeSave:true},
            groups:{plural:"groups", cascadeSave:true},
            role:'long'
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
            taskAssignments:{plural:"taskAssignments", cascadeSave:true, cascadeDelete:true},
            discussions:{plural:"discussions", cascadeSave:true, cascadeDelete:true}
        },
        plural:'tasks'
    },
    taskAssignment:{
        key:'id',
        members: {
            id:'long',
            task:{type:"task", key:"taskID", reciprocal:"taskAssignments"},
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
            group:{type:"group", key:"groupID", reciprocal:"members"}
        },
        plural:'users'
    }
};

if (typeof exports !== 'undefined') exports.model=model;