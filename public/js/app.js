var og, session, running=false;
var ajaxPath='/app/';

$(function() {
    og = new ObjectGraph({});
    og.addSchemata(model, function() {
        //TODO get session
            running=true;

    });
});

function loadSession() {

}