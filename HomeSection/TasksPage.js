var Observable = require("FuseJS/Observable")
var Moment = require("Library/moment")

var app = require( "../app" )
var data = require("../data")

var defns = data.defns

var tasks = Observable()
exports.tasks = tasks

exports.complete = function(args) {
	data.addActivity( data.getDefn(args.data.id) )
}

/* Filters to show only tasks that need to be done by a given date */
var showDoneBy = null
var filter = Observable("all")
exports.filter = filter
filter.onValueChanged( module, function(v) { 
	if (v == "week") {
		showDoneBy = data.currentDate.value.clone().isoWeekday(7).endOf('day')
	} else if( v == "day") { 
		showDoneBy = data.currentDate.value.clone().endOf('day')
	} else {
		showDoneBy = null
	}
	updateTasks()
})

function updateTasks() {
	var have = {}
	
	function useDefn(defn) {
		if (defn.deleted || defn.remain.value <= 0) {
			return false
		}
		
		if (showDoneBy) {
			var minutes = defn.doneDate.value.diff( showDoneBy, 'minutes', true/*float*/ )
			if (minutes >= 1) { //1 for uncertain precision
				return false
			}
		}
		
		return true
	}
	
	//remove finished and deleted ones
	for (var i=tasks.length -1; i >=0; --i) {
		var task = tasks.getAt(i)
		var defn = task.defn.value
		
		if (!useDefn(defn)) {
			tasks.removeAt(i)
		} else {
			have[task.id] = true
		}
	}
	
	//add missing ones
	defns.forEach( function(odefn) {
		var defn = odefn.value
		if (defn.id in have) {
			return
		}
		
		if (useDefn(defn)) {
			tasks.add({
				id: defn.id,
				defn: odefn,
				doneDate: defn.doneDate.map( function(v) {
					return v.format("LL")
				}),
				remainDays: defn.doneDate.map( function(v) {
					return v.diff( data.currentDate.value, 'days' )
				}),
				frequency: odefn.map( function(v) {
					var q = ""
					if (v.count > 1) {
						q += v.count + "x "
					}
					q += v.period
					return q
				})
			})
		}
	})
}

data.tasksVersion.onValueChanged( module, updateTasks )
