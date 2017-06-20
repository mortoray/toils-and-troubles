var Observable = require("FuseJS/Observable")
var FileSystem = require("FuseJS/FileSystem")
var Moment = require("Library/moment")

var tasks = Observable()
exports.tasks = tasks

var defns = Observable()
exports.defns = defns

var tasksMap = {}
var defnMap = {}

exports.getTask = function(id) {
	if (id in taskMap) {
		return taskMap[id]
	}

	//TODO: return dummy?
	return Observable()
}

exports.getDefn = function(id) {
	if (id in defnMap) {
		return defnMap[id]
	}
	
	return Observable()
}

var Period = Object.freeze({
	Daily: "daily",
	Weekly: "weekly",
	Monthly: "monthly",
})

exports.addActivity = function( otask ) {
	otask.value.activity.add( Moment() )
	modifiedDefn(otask)
}

function updateTasks() {
	//update all tasks
	defns.forEach( function(odefn) {
		var defn = odefn.value
		defn.remain.value = defn.count - defn.activity.length
	})

	var have = {}
	//remove finished ones
	for (var i=tasks.length -1; i >=0; --i) {
		var task = tasks.getAt(i).value
		
		if (task.remain.value <= 0) {
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
}

exports.modifiedDefn = function(defn) {
	if (!defn) {
		return
	}
	
	defn.version.value +=1
	updateTasks()
	//give a slight bit of time to accumulate changes before saving them all (don't go too high though since the user will expect immediate persistence)
	setTimeout( saveAll, 1000 )
}

var maxId = 0

exports.newDefn = function() {
	var id = ++maxId
	return createDefn({
		id: id,
		name: "",
		desc: "",
		period: Period.Daily,
		periodStep: 1,
		count: 1,
		icon: "\u{1F514}",
	})
}


var tasksPath = FileSystem.dataDirectory + "/tasks"
if (!FileSystem.existsSync(tasksPath)) {
	FileSystem.createDirectorySync(tasksPath)
}

/**
	Saves all outdated definitions.
*/
function saveAll() {
	defns.forEach( function(d) {
		var defn = d.value
		console.log( "Save:" + defn.id + "@" + defn.version + " == " + defn.savedVersion )
		if (defn.version == defn.savedVersion) {
			return
		}
		
		var name = tasksPath + "/defn_" + defn.id
		var stripDerived = function(key, value) {
			if (key == "activity" ) {
				return stripObservable(value)
			} 
			if (value instanceof Observable) {
				return undefined
			}
			if (value instanceof Moment || value instanceof Date) {
				return value.toISOString()
			}
			return value
		}
		
		var data = JSON.stringify( defn, stripDerived, "\t" )
		console.log( "Saving " + defn.name + "#" + defn.id )
		FileSystem.writeTextToFileSync(name, data)
		defn.savedVersion = defn.version
	})
}
exports.saveAll = saveAll

function stripObservable(o) {
	var out = []
	o.forEach( function(d) {
		out.push(d)
	})
	return out
}

function basename(path) {
	return path.replace(/^.*[\\\/]/, '')
}

function startsWith(str, sub) {
	return str.lastIndexOf(sub, 0) === 0
}

function loadData() {
	var files = FileSystem.listFilesSync( tasksPath )
	files.forEach( function(f) {
		var base = basename(f)
		if (startsWith(base,"defn_")) {
			loadDefn(f)
		} else {
			console.log( "Unrecognized data: " + f )
		}
	})
	updateTasks()
}

function loadDefn(f) {
	try {
		var data = FileSystem.readTextFromFileSync(f)
		var obj = JSON.parse(data)
		var defn = createDefn(obj)
		defn.value.savedVersion = defn.version
		maxId = Math.max(maxId, defn.value.id)

	} catch( e ) {
		console.log( "" + e )
		console.log( "Cannot load file: " + f )
	}
}

exports.sampleData = function() {
	var fixedDefns = [{
		id: ++maxId,
		name: "Pay Bills",
		desc: "Mindnumbingly work through the stack",
		period: Period.Monthly,
		periodStep: 1,
		count: 1,
		icon: "\u{1F4B6}",
	}, {
		id: ++maxId,
		name: "Go for a ride",
		desc: "Take the bike out for and hour or so",
		period: Period.Weekly,
		periodStep: 1,
		count: 2,
		icon: "\u{1F6B4}",
	}, {
		id: ++maxId,
		name: "Investments",
		desc: "Check the state of the investments",
		period: Period.Weekly,
		periodStep: 2,
		count: 1,
		icon: "\u{1F4B0}",
	}, {
		id: ++maxId,
		name: "Yoga",
		desc: "Play the human puppet for a while",
		period: Period.Daily,
		periodStep: 1,
		count: 1,
		//icon: "\u{1F9D8}",
		icon: "\u{1F483}",
	}]

	fixedDefns.forEach( function(v) {
		var activity = Observable()
		var defn = createDefn(v)
		maxId = Math.max( v.id, maxId )
	})
	updateTasks()
}

function createDefn(data) {
	//TODO: handle format errors
	var cact = (data.activity || []).map( function(v) {
		return Moment(v, Moment.ISO_8601)
	})
	data.activity = Observable()
	data.activity.replaceAll(cact)
	
	data.remain = Observable(0)
	
	//version will track if we need to save this object again
	data.version = 1
	data.savedVersion = 0
	var defn = Observable(data)
	
	defnMap[data.id] = defn
	//TODO: check if already exists
	defns.add(defn)
	return defn
}

setTimeout( loadData, 1 )
