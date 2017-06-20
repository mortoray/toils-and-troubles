var Observable = require("FuseJS/Observable")

var tasks = Observable()
exports.tasks = tasks

var tasksMap = {}
exports.getTask = function(id) {
	if (id in taskMap) {
		return taskMap[id]
	}

	//TODO: return dummy?
	return Observable()
}

var Period = Object.freeze({
	Daily: "daily",
	Weekly: "weekly",
	Monthly: "monthly",
})

var fixedDefns = [{
	id: 1,
	name: "Pay Bills",
	desc: "Mindnumbingly work through the stack",
	period: Period.Monthly,
	periodStep: 1,
	count: 1,
	icon: "\u{1F4B6}",
}, {
	id: 2,
	name: "Go for a ride",
	desc: "Take the bike out for and hour or so",
	period: Period.Weekly,
	periodStep: 1,
	count: 2,
	icon: "\u{1F6B4}",
}, {
	id: 3,
	name: "Investments",
	desc: "Check the state of the investments",
	period: Period.Weekly,
	periodStep: 2,
	count: 1,
	icon: "\u{1F4B0}",
}, {
	id: 4,
	name: "Yoga",
	desc: "Play the human puppet for a while",
	period: Period.Daily,
	periodStep: 1,
	count: 1,
	//icon: "\u{1F9D8}",
	icon: "\u{1F483}",
}]

function init() {
	fixedDefns.forEach( function(v) {
		var activity = Observable()
		var defn = Observable(v)
		
		task = {
			id: v.id,
			remain: Observable(0),
			defn: Observable(v),
			activity: activity,
		}
		tasksMap[task.id] = task
		tasks.add(task)
	})
	updateTasks()
}

exports.addActivity = function( task ) {
	task.activity.add( new Date() )
	updateTasks()
}

function updateTasks() {
	//remove finished ones
	for (var i=tasks.length -1; i >=0; --i) {
		var task = tasks.getAt(i)
		var remain = task.defn.value.count - task.activity.length
		task.remain.value = remain
		
		if (remain <= 0) {
			tasks.removeAt(i)
		}
	}
}


init()