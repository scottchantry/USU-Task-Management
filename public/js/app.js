var og, session, running=false;

$(function() {
    og = new ObjectGraph({});
    og.addSchemata(model, function() {
        //TODO get session
            running=true;

    });
});

function loadSession() {

}