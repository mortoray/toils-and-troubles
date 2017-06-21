var Observable = require("FuseJS/Observable")

var app = require( "../app" )
var data = require("../data")

var defns = data.defns

var tasks = Observable()
exports.tasks = tasks

exports.complete = function(args) {
	data.addActivity( data.getDefn(args.data.id) )
}

data.tasksVersion.onValueChanged( module, function() {
	var have = {}
	//remove finished and deleted ones
	for (var i=tasks.length -1; i >=0; --i) {
		var task = tasks.getAt(i).value
		
		if (task.deleted || task.remain.value <= 0) {
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
		
		if (defn.remain.value > 0) {
			tasks.add(odefn)
		}
	})
})