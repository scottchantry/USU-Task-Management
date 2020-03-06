var og, session, running=false, body, bodyLoader, currentScreen, links, screenContainer;
var ajaxPath='/app/';

$(function() {
    body=$('body');
    bodyLoader=Element('div', {class:'ui active inverted dimmer'}).append(
        Element('div', {class:'ui text loader', text:'Loading'})
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
    var menuElement;
    links = {
        home:new Link({name:'Home', default:true, renderScreen:renderHomeScreen}),
        tasks:new Link({name:'Tasks', renderScreen:renderTasksScreen}),
        discussions:new Link({name:'Discussions', renderScreen:renderDiscussionsScreen}),
        timeline:new Link({name:'Timeline', renderScreen:renderTimelineScreen}),
        grading:new Link({name:'Grading', renderScreen:renderGradingScreen})
    };

    body.append(
        menuElement=Element('div', {class:'ui top fixed pointing menu'}).append(
            Element('div', {class:'logo'}).append(
                Element('img', {src:'/app/images/logo.png'})
            )
        ),
        screenContainer=Element('div', {class:'screenContainer'})
    );
    Object.keys(links).forEach(function(linkName) {
        var link=links[linkName];
        menuElement.append(
            link.element=Element('a', {class:'item'+(link.default?' active':''), text:link.name}).click(link.select.bind(link))
        )
    });
    if (!currentScreen) menuElement.find('a.active').click();
    bodyLoader.removeClass('active');

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
function loadSession(cb) {
    return cb(); //TODO remove this
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
function Screen(attr) {
    this.element=Element('div', {class:"screen"});
    screenContainer.append(this.element);
    this.show=function() {
        this.element.show();
    };
    this.hide=function() {
        this.element.hide();
    };
    return this;
}
function Link(attr) {
    this.name=attr.name;
    this.default=attr.default;
    this.selected=false;
    this.renderScreen=attr.renderScreen.bind(null, this);
    this.select=function() {
        var link=this;
        this.selected=true;
        Object.keys(links).forEach(function(linkName) {
            var theLink = links[linkName];
            if (theLink!==link) theLink.unselect();
        });
        link.element.addClass('active');
        if (!link.screen) link.renderScreen();
        currentScreen=link.screen;
        currentScreen.show();
    };
    this.unselect=function() {
        if (this.screen) this.screen.hide();
        this.selected=false;
        this.element.removeClass('active');
    };
}



// UI Helpers
jQuery.fn.extend({
    model: function(model, field, saved, placeholder, afterProcess) {
        if (!model) {
            console.error("No model was provided for binding.");
            return this;
        }
        return this.each(function(index, element) {
            var nodeName = element.nodeName, val;
            var key = saved?'saved':field;
            var $element = jQuery(element);
            if (nodeName === 'INPUT' || nodeName === 'TEXTAREA' || $element.prop('contenteditable')==='true') {
                // two-way binding
                if (og.isModel(model)) {
                    model.subscribe(key, function() {
                        //if (document.activeElement!==element) {
                        if ($element.attr('type') === 'checkbox') $element.prop('checked', !!model.get(field));
                        else if ($element.prop('contenteditable') === 'true') $element.text(model.get(field));
                        else $element.val(model.get(field));
                        //}
                    });
                    setImmediate(function(){
                        if ($element.prop('contenteditable')==='true') $element.on('input', function() {
                            model.set(field, $element.text());
                        });
                        else $element.on('input', function() {
                            model.set(field, $element.val());
                        });
                    });
                }
                else {
                    // it's NOT a model, rig a one-way binding
                    if ($element.attr('type')==='checkbox') {
                        $element.prop('checked', !!model[field]);
                        $element.click(function() {
                            model[field] = $element[0].checked;
                        });
                    }
                    else {
                        $element.val(model[field]);
                        $element.change(function() {
                            model[field] = $element.val();
                        });
                        if (placeholder) $element.attr('placeholder', placeholder);
                    }
                }
            }
            else if (nodeName === 'SPAN' || nodeName === 'DIV' || nodeName === 'TD') {
                // one-way dynamic binding
                placeholder = placeholder || '';
                if (og.isModel(model)) {
                    $element.text(field?((val=model.get(field)) || (val!==undefined&&val!==null?val:placeholder)):model);
                    if (afterProcess) afterProcess(model, $element);
                    model.subscribe(key, true, function() {
                        $element.text(field?((val=model.get(field)) || (val!==undefined&&val!==null?val:placeholder)):model);
                        if (afterProcess) afterProcess(model, $element);
                    });
                }
                // if not a model, one-way static (no binding)
                else $element.text(field?model[field]:model);
            }
            else console.warn('As yet unsupported tag for model binding.');
        });
    },
    focusAfter: function() {
        return this.each(function(index, element) {
            setTimeout(function() {jQuery(element).focus()}, 100);
        });
    }
});
function Element(tagName, attrs) {
    // generate jQuery-wrapped DOM without incurring the regex cost in the jQuery constructor
    var attr, val;
    var svgTagNames = ['svg','g','polygon','rect','circle','path','line','text','radialGradient','linearGradient','stop','filter','feGaussianBlur','feOffset','feMerge','feMergeNode','feColorMatrix','feComponentTransfer','feFuncA','feFlood','feComposite'];
    var element = svgTagNames.indexOf(tagName) !== -1 ? document.createElementNS('http://www.w3.org/2000/svg', tagName) : (tagName ? document.createElement(String(tagName)) : document.createDocumentFragment());
    if (tagName==='svg' && (!attrs || !attrs.focusable)) element.setAttribute('focusable', false);//by default mark svg as non-focusable
    if (attrs) {
        for (attr in attrs) {
            if (Object.prototype.hasOwnProperty.call(attrs, attr)) {
                val = attrs[attr];
                if (attr === 'text') {
                    if (val !== null) element.appendChild(document.createTextNode(val));
                }
                else if (attr === 'children') {
                    if (val !== null) val.forEach(append);
                }
                else if (attr === 'html') element.innerHTML = val;
                else element.setAttribute(attr, val);
            }
        }
    }
    function append(child) {element.appendChild(child)}
    var jQElement = $(element);
    var nodeName = element.nodeName;
    if ((nodeName==='SPAN' || nodeName==='DIV') && jQElement.prop('contenteditable')==="true" && element.hasAttribute('maxLength')) {
        jQElement.on("keypress", function() {
            return this.innerHTML.length < this.getAttribute("maxLength");
        }).on("paste", function(e) {
            e.preventDefault();//Insert as plain text
            var limit = this.getAttribute("maxLength"), len = this.innerHTML.length, cp;
            if ((e.originalEvent || e).clipboardData || window.clipboardData) {
                cp = ((e.originalEvent || e).clipboardData || window.clipboardData).getData('text');
            }
            if (cp && cp!=='' && len<=limit) {
                var text = cp.substring(0, limit - len);
                if (text && text!=='') {
                    if (document.queryCommandSupported('insertText')) {
                        document.execCommand('insertText', false, text);
                    }
                    else if (document.getSelection()) {
                        document.getSelection().getRangeAt(0).insertNode(document.createTextNode(text));
                    }
                    else if (document.selection) {
                        document.selection.createRange().pasteHTML(text);
                    }
                }
            }
            return false;
        });
    }
    return jQElement;
}