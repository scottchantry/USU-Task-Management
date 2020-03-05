var og, session, running=false, body, bodyLoader;
var ajaxPath='/app/';

$(function() {
    body=$('body');
    bodyLoader=Element('div', {class:'ui'}).append(
        Element('div', {class:'ui active inverted dimmer'}).append(
            Element('div', {class:'ui text loader', text:'Loading'})
        )
    );
    body.append(bodyLoader);
    og = new ObjectGraph({});
    og.addSchemata(model, function() {
        loadSession(function(userSession) {
            session=userSession;
            running=true;
            renderApp();
        });
    });
});

function renderApp() {
    var menuElement, currentScreen;

    var links = {
        home:{name:'Home', default:true, renderScreen:renderHomeScreen.bind(null, this)},
        tasks:{name:'Tasks', renderScreen:renderTasksScreen.bind(null, this)},
        discussions:{name:'Discussions', renderScreen:renderDiscussionsScreen.bind(null, this)},
        timeline:{name:'Timeline', renderScreen:renderTimelineScreen.bind(null, this)},
        grading:{name:'Grading', renderScreen:renderGradingScreen.bind(null, this)}
    };

    body.append(
        menuElement=Element('div', {class:'ui top fixed pointing menu'}).append(
            Element('div', {class:'item'}).append(
                Element('img', {src:'/app/images/logo.png'})
            )
        )
    );
    links.forEach(function(link) {
        menuElement.append(
            Element('a', {class:'item'+(link.default?' active':''), text:link.name}).click(function() {
               if (!currentScreen && link.default || currentScreen !== link.screen) {
                   if (currentScreen) currentScreen.hide();
                   if (!link.screen) link.renderScreen();
                   currentScreen=link.screen;
                   currentScreen.show();
               }
            })
        )
    });


    function renderHomeScreen(link) {
        link.screen = new Screen();
    }
    function renderTasksScreen(link) {
        link.screen = new Screen();
    }
    function renderDiscussionsScreen(link) {
        link.screen = new Screen();
    }
    function renderTimelineScreen(link) {
        link.screen = new Screen();
    }
    function renderGradingScreen(link) {
        link.screen = new Screen();
    }
}
function Screen(attr) {
    this.element=Element('div');

    this.show=function() {
        this.element.show();
    };
    this.hide=function() {
        this.element.hide();
    };
    return this;
}

function loadSession(cb) {
    if (!cb) throw "no callback";
    var path='service/session';
    var jqxhr=$.ajax({
        url:ajaxPath+path,
        beforeSend:function(xhr) {
            if (getBeforeSend) getBeforeSend().call(this, xhr);
        },
        dataType:'json'
    });
    jqxhr.done(function(data) {
        if (Object.keys(data).length) og.add('session', data, cb);
        else cb();
    });
    jqxhr.fail(handleError(cb));

}