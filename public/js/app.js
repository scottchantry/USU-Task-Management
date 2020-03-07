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
		var tasksBody, theGroup = og.groups.at(0), newTaskButton;
		var tasksElement = Element('div', {class: 'ui raised segment'}).append(
			newTaskButton=Element('button', {class:'mini ui labeled icon button'}).append(
				Element('i', {class:'plus icon'}),
				"New Task"
			),
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
		newTaskButton.click(function() {
			og.add('task', {canvasAssignmentID:session.assignment.id, canvasGroupID:theGroup.id});
			//TODO click the task
		})
		theGroup.tasks.forEach(renderTaskRow);
		theGroup.tasks.subscribe('add', true, function(key, value) {
			renderTaskRow(value).click();
		});
		link.screen = new Screen({element: tasksElement});

		function renderTaskRow(task) {
			var taskRow, statusElement, startDateElement, endDateElement;
			var taskLink = new Link({task:task, renderScreen:renderTaskScreen});
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
						deleteModal('Delete Task', "Are you sure you want to delete the following task?<br><br>"+task.name, function(deleteTask) {
							if (deleteTask) {
								task.erase();
								//TODO task.save()
							}
						});
					})
				)
			);

			task.subscribe('startDate', function() {
				if (task.startDate) startDateElement.text(task.formatStartDate())
			});
			task.subscribe('endDate', function() {
				if (task.endDate) endDateElement.text(task.formatEndDate())
			});
			task.subscribe('taskAssignments', function() {
				var inProgress = 0, completed = 0;
				task.taskAssignments.forEach(function(assignment) {
					if (assignment.status === 2) inProgress++;
					else if (assignment.status === 3) completed++;
				});
				if (completed===task.taskAssignments.length) statusElement.text('Complete');
				else if (inProgress) statusElement.text('In Progress');
				else statusElement.text('Not Started');
			});
			task.subscribe('deleted', true, function() {
				taskRow.remove()
			});
			taskRow.click(function() {
				taskLink.show();
			});
			tasksBody.append(taskRow);

			task.taskAssignments.forEach(addAssignmentRow);
			task.taskAssignments.subscribe('add', true, function(key, value){addAssignmentRow(value)});

			return taskRow;
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
				var definedButton, progressButton, completedButton;
				assignmentRow=Element('tr', {class: 'assignmentRow'}).append(
					Element('td', {class: 'collapsing'}),
					Element('td').model(assignment.user, 'name'), //TODO change to drop down?
					assignmentStatusElement = Element('td', {class: 'collapsing status'}).append(
						definedButton=Element('button', {class: 'mini ui icon button', text:'N', title:'Not Started'}).click(setStatus(1)),
						progressButton=Element('button', {class: 'mini ui icon button', text:'P', title:'In Progress'}).click(setStatus(2)),
						completedButton=Element('button', {class: 'mini ui icon button', text:'C', title:'Complete'}).click(setStatus(3))
					),
					Element('td', {class: 'collapsing'}),
					Element('td', {class: 'collapsing'}),
					Element('td', {class: 'collapsing delete'}).append(
						Element('i', {class: 'trash alternate icon'}).click(function(e) {
							e.stopPropagation();
							deleteModal('Delete Task Assignment', "Are you sure you want to delete the task assignment for "+assignment.user.name+"?", function(deleteAssignment) {
								if (deleteAssignment) {
									assignment.erase();
									//TODO task.save()
								}
							});
						})
					)
				);

				var insertAfter = taskRow;
				while (insertAfter.next().hasClass('assignmentRow')) {
					insertAfter=insertAfter.next();
				}
				insertAfter.after(assignmentRow);
				assignment.subscribe('deleted', true, function(){assignmentRow.remove()});
				assignment.subscribe('status', function() {
					definedButton.removeClass('primary');
					progressButton.removeClass('primary');
					completedButton.removeClass('primary');
					if (assignment.status===1) definedButton.addClass('primary');
					else if (assignment.status===2) progressButton.addClass('primary');
					else if (assignment.status===3) completedButton.addClass('primary');
				});
				function setStatus(status) {
					return function() {
						assignment.status=status;
						//TODO task.save();
					}
				}
			}
		}
	}

	function renderTaskScreen(link) {
		var task = link.task, saveButton, taskNameField, startElement, startDateField, endElement, endDateField, newButton, assignmentsBody;

		var taskElement = Element('div', {class: 'ui raised segment'}).append(
			Element('div', {class: 'ui grid'}).append(
				Element('div', {class:'sixteen wide column'}).append(
					saveButton=Element('button', {class:'mini ui labeled icon button'}).append(
						Element('i', {class:'save icon'}),
						"Save"
					)
				),
				Element('div', {class:'eight wide column'}).append(
					Element('div', {class:'ui form'}).append(
						taskNameField=Element('div', {class:'field'}).append(
							Element('label').text("Task Name"),
							Element('div', {class:'ui fluid input'}).append(
								Element('input', {type:'text', placeholder:'Task Name'}).model(task, 'name')
							)
						)
					)
				),
				Element('div', {class:'two wide column'}).append(
					Element('div', {class:'eight wide column'}).append(
						Element('div', {class:'ui form'}).append(
							startDateField=Element('div', {class:'field'}).append(
								Element('label').text("Start Date"),
								startElement=Element('div', {class:'ui calendar'}).append(
									Element('div', {class:'ui input left icon'}).append(
										Element('i', {class:'calendar icon'}),
										Element('input', {type:'text', placeholder:'Start Date'})
									)
								)
							)
						)
					)
				),
				Element('div', {class:'two wide column'}).append(
					Element('div', {class:'ui form'}).append(
						endDateField=Element('div', {class:'field'}).append(
							Element('label').text("End Date"),
							endElement=Element('div', {class:'ui calendar'}).append(
								Element('div', {class:'ui input left icon'}).append(
									Element('i', {class:'calendar icon'}),
									Element('input', {type:'text', placeholder:'End Date'})
								)
							)
						)
					)
				),
				Element('div', {class:'sixteen wide column'}).append(
					Element('div', {class:'ui form'}).append(
						Element('div', {class:'field'}).append(
							Element('label').text('Description'),
							Element('textarea').model(task, 'description')
						)
					)
				),
				Element('div', {class:'sixteen wide column'}).append(
					Element('h4', {class:'ui header'}).text("Task Assignments"),
					newButton=Element('button', {class:'mini ui labeled icon button'}).append(
						Element('i', {class:'plus icon'}),
						"New"
					),
					Element('table', {class: 'ui single line table'}).append(
						Element('thead').append(
							Element('tr').append(
								Element('th').text('Student'),
								Element('th').text('Status'),
								Element('th', {class: 'delete'}).text('Delete')
							)
						),
						assignmentsBody = Element('tbody')
					)
				)
			)
		);
		task.subscribe('name', function() {
			if (!task.name) taskNameField.addClass('error');
			else taskNameField.removeClass('error');
		});
		task.subscribe('startDate', function() {
			if (task.startDate) {
				startElement.calendar('set date', task.startDate, true);
				startDateField.removeClass('error');
			}
			else startDateField.addClass('error');
		});
		task.subscribe('endDate', function() {
			if (task.endDate) {
				endElement.calendar('set date', task.endDate, true);
				endDateField.removeClass('error');
			}
			else endDateField.addClass('error');
		});
		if (task.startDate) startElement.calendar('set date', task.startDate, true);
		if (task.endDate) endElement.calendar('set date', task.endDate, true);
		startElement.calendar({
			type:'date',
			endCalendar:endElement,
			onChange:function(date, text, mode) {
				task.startDate=date.getTime();
			},
			formatter: {
				date: function(date, settings) {
					if (!date) return task.startDate.format();
					return date.format();
				}
			}
		});
		endElement.calendar({
			type:'date',
			startCalendar:startElement,
			onChange:function(date, text, mode) {
				task.endDate=date.getTime();
			},
			formatter: {
				date: function(date, settings) {
					if (!date) return task.endDate.format();
					return date.format();
				}
			}
		});

		task.taskAssignments.forEach(addAssignmentRow);
		task.taskAssignments.subscribe('add', true, function(key, value){addAssignmentRow(value)});

		task.subscribe(undefined, function() {
			if (task.validates()) saveButton.removeClass('disabled');
			else saveButton.addClass('disabled');
		});

		saveButton.click(function() {
			saveButton.addClass('disabled loading');
			task.save(function() {
				saveButton.removeClass('loading');
				task.publish('updateButton');
			});
		});

		newButton.click(function() {
			og.add('taskAssignment', {task:task, status:1, canvasUserID:session.user.id});
		});

		link.screen = new Screen({element: taskElement});

		function addAssignmentRow(assignment) {
			var assignmentRow, assignmentStatusElement, userSelect;
			var definedButton, progressButton, completedButton;
			assignmentRow=Element('tr', {class: 'assignmentRow'}).append(
				Element('td').append(
					userSelect=Element('select')
				),
				assignmentStatusElement = Element('td', {class: 'collapsing status'}).append(
					definedButton=Element('button', {class: 'mini ui icon button', text:'N', title:'Not Started'}).click(setStatus(1)),
					progressButton=Element('button', {class: 'mini ui icon button', text:'P', title:'In Progress'}).click(setStatus(2)),
					completedButton=Element('button', {class: 'mini ui icon button', text:'C', title:'Complete'}).click(setStatus(3))
				),
				Element('td', {class: 'collapsing delete'}).append(
					Element('i', {class: 'trash alternate icon'}).click(function(e) {
						e.stopPropagation();
						deleteModal('Delete Task Assignment', "Are you sure you want to delete the task assignment for "+assignment.user.name+"?", function(deleteAssignment) {
							if (deleteAssignment) {
								assignment.erase();
							}
						});
					})
				)
			);

			var userFound=false;
			var usersArray=task.group.members.map(function(member) {
				return {
					name:member.name,
					value:member.id,
					selected:(assignment.user===member)
				};
			});
			userSelect.dropdown({
				onChange:function(value, text, selectedOption) {
					if (!value) return;
					assignment.user=og.users.by(value);
				},
				values:usersArray
			});

			assignmentsBody.append(assignmentRow);
			assignment.subscribe('deleted', true, function(){assignmentRow.remove()});
			assignment.subscribe('status', function() {
				definedButton.removeClass('primary');
				progressButton.removeClass('primary');
				completedButton.removeClass('primary');
				if (assignment.status===1) definedButton.addClass('primary');
				else if (assignment.status===2) progressButton.addClass('primary');
				else if (assignment.status===3) completedButton.addClass('primary');
			});
			function setStatus(status) {
				return function() {
					assignment.status=status;
				}
			}
		}
	}

	function renderDiscussionsScreen(link) {
		var theGroup = og.groups.at(0)
		var discussionsElement = Element('div', {class: 'ui raised segment'});
		theGroup.discussions.sort(byDate).forEach(renderDiscussion)

		//TODO add new post




		link.screen = new Screen({element: discussionsElement});

		function byDate(a,b) {
			if (a.created < b.created) return -1;
			if (a.created > b.created) return 1;
			return 0;
		}
		function renderDiscussion(discussion) {
			discussionsElement.append(
				Element('div', {class:'ui compact segment'}).append(
					Element('div', {class:'ui'}).append(
						Element('span', {class:''}).text(discussion.user.name),
						Element('span', {class:''}).text(discussion.created.format())
					),
					Element('div', {class:'ui'}).append(
						Element('span').text(discussion.text)
					)
				)
			);
		}
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
	fakeSession.groups[0].discussions.push({created:new Date(2020,1,1,10,10,0,0), text:"Discussion text", canvasUserID:2});
	fakeSession.groups[0].discussions.push({created:new Date(2020,2,2,13,10,0,0), text:"Discussion text2", canvasUserID:3});

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
	this.task = attr.task;
	this.show = function() {
		var link = this;
		if (!link.screen) link.renderScreen();
		currentScreen.hide();
		currentScreen = link.screen;
		currentScreen.show();
	};
	this.select = function() {
		var link = this;
		this.selected = true;
		Object.keys(links).forEach(function(linkName) {
			var theLink = links[linkName];
			if (theLink !== link) theLink.unselect();
		});
		if (currentScreen) currentScreen.hide();
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

function deleteModal(title, message, cb) {
	var modalElement, cancelButton, deleteButton;
	modalElement=Element('div', {class:'ui tiny modal'}).append(
		Element('div', {class:'header'}).text(title),
		Element('div', {class:'content'}).append(
			Element('div', {class:'description'}).append(
				Element('p').html(message)
			)
		),
		Element('div', {class:'actions'}).append(
			cancelButton=Element('div', {class:'ui green ok cancel button'}).append(
				Element('i', {class:'remove icon'}),
				"No"
			),
			deleteButton=Element('div', {class:'ui red approve button'}).append(
				Element('i', {class:'trash icon'}),
				"Delete"
			)
		)
	);
	body.append(modalElement);

	cancelButton.click(function() {
		cb(false);
		setTimeout(function(){modalElement.remove()},250);
	});
	deleteButton.click(function() {
		cb(true);
		setTimeout(function(){modalElement.remove()},250);
	});
	modalElement.modal('show');
}
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