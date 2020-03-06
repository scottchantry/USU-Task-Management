var og, session, running = false, body, bodyLoader, currentScreen, links, screenContainer;
var ajaxPath = '/app/';

$(function() {
	body = $('body');
	bodyLoader = Element('div', {class: 'ui active inverted dimmer'}).append(
		Element('div', {class: 'ui text loader', text: 'Loading'})
	);
	body.append(bodyLoader);
	og = new ObjectGraph({});
	og.addSchemata(model, function() {
		loadSession(function(userSession) {
			session = userSession;
			running = true;
			renderApp();
		});
	});
});

function renderApp() {
	var menuElement;
	links = {
		home: new Link({name: 'Home', default: true, renderScreen: renderHomeScreen}),
		tasks: new Link({name: 'Tasks', renderScreen: renderTasksScreen}),
		discussions: new Link({name: 'Discussions', renderScreen: renderDiscussionsScreen}),
		timeline: new Link({name: 'Timeline', renderScreen: renderTimelineScreen}),
		grading: new Link({name: 'Grading', renderScreen: renderGradingScreen})
	};

	body.append(
		menuElement = Element('div', {class: 'ui top fixed pointing menu'}).append(
			Element('div', {class: 'logo'}).append(
				Element('img', {src: '/app/images/logo.png'})
			)
		),
		screenContainer = Element('div', {class: 'screenContainer'})
	);
	Object.keys(links).forEach(function(linkName) {
		var link = links[linkName];
		menuElement.append(
			link.element = Element('a', {
				class: 'item' + (link.default ? ' active' : ''),
				text: link.name
			}).click(link.select.bind(link))
		)
	});
	if (!currentScreen) menuElement.find('a.active').click();
	bodyLoader.removeClass('active');

	function renderHomeScreen(link) {
		var homeElement = Element('div').text('Home Screen');
		link.screen = new Screen({element: homeElement});
	}

	function renderTasksScreen(link) {
		var tasksBody, theGroup = og.groups.at(0);
		var tasksElement = Element('div', {class: 'ui raised segment'}).append(
			Element('div').text('All Tasks'),
			Element('table', {class: 'ui selectable single line table'}).append(
				Element('thead').append(
					Element('tr').append(
						Element('th').text(''),
						Element('th').text('Name'),
						Element('th').text('Status'),
						Element('th').text('Start Date'),
						Element('th').text('End Date'),
						Element('th', {class: 'delete'}).text('Delete')
					)
				),
				tasksBody = Element('tbody')
			)
		);
		theGroup.tasks.forEach(renderTaskRow);

		link.screen = new Screen({element: tasksElement});

		function renderTaskRow(task) {
			var taskRow, statusElement, startDateElement, endDateElement;

			taskRow = Element('tr', {class: 'taskRow'}).append(
				Element('td', {class: 'collapsing'}).append(
					Element('i', {class: 'caret right icon'}).click(expander)
				),
				Element('td').model(task, 'name'),
				statusElement = Element('td', {class: 'collapsing'}),
				startDateElement = Element('td', {class: 'collapsing'}),
				endDateElement = Element('td', {class: 'collapsing'}),
				Element('td', {class: 'collapsing delete'}).append(
					Element('i', {class: 'trash alternate icon'}).click(function(e) {
						e.stopPropagation();
						alert('delete click')
						//TODO show modal to confirm
						//task.erase();
					})
				)
			);

			task.subscribe('startDate', function() {
				startDateElement.text(task.formatStartDate())
			});
			task.subscribe('endDate', function() {
				endDateElement.text(task.formatEndDate())
			});
			task.subscribe('taskAssignments', function() {
				var inProgress = 0, completed = 0;
				task.taskAssignments.forEach(function(assignment) {
					if (assignment.status === 2) inProgress++;
					else if (assignment.status === 3) completed++;
				});
				//TODO set status buttons
				statusElement.text('status')
			});
			task.subscribe('deleted', true, function() {
				taskRow.remove()
			});
			taskRow.click(function() {
				//TODO go to task screen OR SHOULD WE REQUIRE CLICKING ON THE TASK NAME
				alert('row click')
			});
			tasksBody.append(taskRow);

			task.taskAssignments.forEach(addAssignmentRow);
			task.taskAssignments.subscribe('add', true, function(key, value){addAssignmentRow(value)});

			function expander(e) {
				e.stopPropagation();
				var elem = $(this);
				var collapsed = elem.hasClass('right');
				if (collapsed) {
					elem.removeClass('right').addClass('down');
					showAssignments(true);
				}
				else {
					elem.removeClass('down').addClass('right');
					showAssignments(false);
				}
				function showAssignments(show) {
					var assignmentRow=taskRow.next();
					while (assignmentRow.hasClass('assignmentRow')) {
						show ? assignmentRow.show() : assignmentRow.hide()
						assignmentRow=assignmentRow.next();
					}
				}
			}
			function addAssignmentRow(assignment) {
				var assignmentRow, assignmentStatusElement;
				assignmentRow=Element('tr', {class: 'assignmentRow'}).append(
					Element('td', {class: 'collapsing'}),
					Element('td').model(assignment.user, 'name'), //TODO change to drop down
					assignmentStatusElement = Element('td', {class: 'collapsing'}),
					Element('td', {class: 'collapsing'}),
					Element('td', {class: 'collapsing'}),
					Element('td', {class: 'collapsing delete'}).append(
						Element('i', {class: 'trash alternate icon'}).click(function(e) {
							e.stopPropagation();
							alert('delete click')
							//TODO show modal to confirm
							//assignment.erase();
						})
					)
				);

				var insertAfter = taskRow;
				while (insertAfter.next().hasClass('assignmentRow')) {
					insertAfter=insertAfter.next();
				}
				insertAfter.after(assignmentRow);
				assignment.subscribe('deleted', true, function(){assignmentRow.remove()});
			}
		}

	}

	function renderDiscussionsScreen(link) {
		var discussionsElement = Element('div').text('Discussions Screen');
		link.screen = new Screen({element: discussionsElement});
	}

	function renderTimelineScreen(link) {
		var timelineElement = Element('div').text('Timeline Screen');
		link.screen = new Screen({element: timelineElement});
	}

	function renderGradingScreen(link) {
		var gradingElement = Element('div').text('Grading Screen');
		link.screen = new Screen({element: gradingElement});
	}
}

function loadSession(cb) {
	var fakeSession = JSON.parse('{"id":"9AfuX1pJdNqmNMRAViMGJ5p09RctjPBm","user":{"id":2,"name":"Scott Chantry","role":1},"course":{"id":1,"name":"Sample Course 101"},"assignment":{"id":1,"name":"Test","courseID":1,"rubric":{"id":1,"title":"MyRubric","criterion":[]}},"groups":[{"id":1,"name":"Group 1","members":[{"id":3,"name":"Jenalee Chantry","role":2}],"tasks":[{"id":1,"name":"Task1","description":"This is task 1","startDate":1583391600000,"endDate":1583733600000,"groupTask":false,"taskAssignments":[{"id":1,"status":1,"canvasUserID":3}],"discussions":[],"canvasAssignmentID":1},{"id":2,"name":"Task2","description":"This is task 2","startDate":1583820000000,"endDate":1584597600000,"groupTask":false,"taskAssignments":[{"id":2,"status":2,"canvasUserID":3}],"discussions":[],"canvasAssignmentID":1}],"discussions":[],"courseID":1},{"id":2,"name":"Group2","members":[],"tasks":[],"discussions":[],"courseID":1}]}');
	og.add('session', fakeSession, cb);
	return;//TODO remove this

	if (!cb) throw "no callback";
	var path = 'service/session';
	var jqxhr = $.ajax({
		url: ajaxPath + path,
		beforeSend: function(xhr) {
			if (getBeforeSend) getBeforeSend().call(this, xhr);
		},
		dataType: 'json'
	});
	jqxhr.done(function(data) {
		if (Object.keys(data).length) og.add('session', data, cb);
		else cb();
	});
	jqxhr.fail(handleError(cb));
}

function Screen(attr) {
	this.element = Element('div', {class: "screen"}).append(attr.element);
	screenContainer.append(this.element);
	this.show = function() {
		this.element.show();
	};
	this.hide = function() {
		this.element.hide();
	};
	return this;
}

function Link(attr) {
	this.name = attr.name;
	this.default = attr.default;
	this.selected = false;
	this.renderScreen = attr.renderScreen.bind(null, this);
	this.select = function() {
		var link = this;
		this.selected = true;
		Object.keys(links).forEach(function(linkName) {
			var theLink = links[linkName];
			if (theLink !== link) theLink.unselect();
		});
		link.element.addClass('active');
		if (!link.screen) link.renderScreen();
		currentScreen = link.screen;
		currentScreen.show();
	};
	this.unselect = function() {
		if (this.screen) this.screen.hide();
		this.selected = false;
		this.element.removeClass('active');
	};
}


// UI Helpers
window.Date.prototype.format = function() {
	if (this) return (this.getMonth() + 1) + '/' + this.getDate() + '/' + this.getFullYear();
	else return '';
};
jQuery.fn.extend({
	model: function(model, field, saved, placeholder, afterProcess) {
		if (!model) {
			console.error("No model was provided for binding.");
			return this;
		}
		return this.each(function(index, element) {
			var nodeName = element.nodeName, val;
			var key = saved ? 'saved' : field;
			var $element = jQuery(element);
			if (nodeName === 'INPUT' || nodeName === 'TEXTAREA' || $element.prop('contenteditable') === 'true') {
				// two-way binding
				if (og.isModel(model)) {
					model.subscribe(key, function() {
						//if (document.activeElement!==element) {
						if ($element.attr('type') === 'checkbox') $element.prop('checked', !!model.get(field));
						else if ($element.prop('contenteditable') === 'true') $element.text(model.get(field));
						else $element.val(model.get(field));
						//}
					});
					setImmediate(function() {
						if ($element.prop('contenteditable') === 'true') $element.on('input', function() {
							model.set(field, $element.text());
						});
						else $element.on('input', function() {
							model.set(field, $element.val());
						});
					});
				}
				else {
					// it's NOT a model, rig a one-way binding
					if ($element.attr('type') === 'checkbox') {
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
					$element.text(field ? ((val = model.get(field)) || (val !== undefined && val !== null ? val : placeholder)) : model);
					if (afterProcess) afterProcess(model, $element);
					model.subscribe(key, true, function() {
						$element.text(field ? ((val = model.get(field)) || (val !== undefined && val !== null ? val : placeholder)) : model);
						if (afterProcess) afterProcess(model, $element);
					});
				}
				// if not a model, one-way static (no binding)
				else $element.text(field ? model[field] : model);
			}
			else console.warn('As yet unsupported tag for model binding.');
		});
	},
	focusAfter: function() {
		return this.each(function(index, element) {
			setTimeout(function() {
				jQuery(element).focus()
			}, 100);
		});
	}
});

function Element(tagName, attrs) {
	// generate jQuery-wrapped DOM without incurring the regex cost in the jQuery constructor
	var attr, val;
	var svgTagNames = ['svg', 'g', 'polygon', 'rect', 'circle', 'path', 'line', 'text', 'radialGradient', 'linearGradient', 'stop', 'filter', 'feGaussianBlur', 'feOffset', 'feMerge', 'feMergeNode', 'feColorMatrix', 'feComponentTransfer', 'feFuncA', 'feFlood', 'feComposite'];
	var element = svgTagNames.indexOf(tagName) !== -1 ? document.createElementNS('http://www.w3.org/2000/svg', tagName) : (tagName ? document.createElement(String(tagName)) : document.createDocumentFragment());
	if (tagName === 'svg' && (!attrs || !attrs.focusable)) element.setAttribute('focusable', false);//by default mark svg as non-focusable
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

	function append(child) {
		element.appendChild(child)
	}

	var jQElement = $(element);
	var nodeName = element.nodeName;
	if ((nodeName === 'SPAN' || nodeName === 'DIV') && jQElement.prop('contenteditable') === "true" && element.hasAttribute('maxLength')) {
		jQElement.on("keypress", function() {
			return this.innerHTML.length < this.getAttribute("maxLength");
		}).on("paste", function(e) {
			e.preventDefault();//Insert as plain text
			var limit = this.getAttribute("maxLength"), len = this.innerHTML.length, cp;
			if ((e.originalEvent || e).clipboardData || window.clipboardData) {
				cp = ((e.originalEvent || e).clipboardData || window.clipboardData).getData('text');
			}
			if (cp && cp !== '' && len <= limit) {
				var text = cp.substring(0, limit - len);
				if (text && text !== '') {
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